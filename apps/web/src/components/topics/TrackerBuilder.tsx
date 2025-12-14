'use client';

import React, { useState } from 'react';
import { Plus, X, Search, Hash, AlertCircle, Save, TestTube } from 'lucide-react';

interface TrackerPattern {
  id: string;
  type: 'keyword' | 'regex' | 'phrase';
  value: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

interface Tracker {
  id: string;
  name: string;
  description: string;
  patterns: TrackerPattern[];
  category: string;
  alertEnabled: boolean;
  alertThreshold: number;
  excludePatterns: string[];
  contextWindow: number; // words before/after to capture
}

interface TrackerBuilderProps {
  tracker?: Tracker;
  onSave: (tracker: Tracker) => void;
  onTest?: (patterns: TrackerPattern[], testText: string) => void;
  categories?: string[];
}

export default function TrackerBuilder({
  tracker,
  onSave,
  onTest,
  categories = ['Competitor', 'Feature', 'Problem', 'Pricing', 'Integration', 'Custom']
}: TrackerBuilderProps) {
  const [name, setName] = useState(tracker?.name || '');
  const [description, setDescription] = useState(tracker?.description || '');
  const [category, setCategory] = useState(tracker?.category || 'Custom');
  const [patterns, setPatterns] = useState<TrackerPattern[]>(
    tracker?.patterns || [{ id: '1', type: 'keyword', value: '', caseSensitive: false, wholeWord: false }]
  );
  const [excludePatterns, setExcludePatterns] = useState<string[]>(tracker?.excludePatterns || []);
  const [alertEnabled, setAlertEnabled] = useState(tracker?.alertEnabled || false);
  const [alertThreshold, setAlertThreshold] = useState(tracker?.alertThreshold || 5);
  const [contextWindow, setContextWindow] = useState(tracker?.contextWindow || 10);
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validatePattern = (pattern: TrackerPattern): string | null => {
    if (!pattern.value.trim()) {
      return 'Pattern cannot be empty';
    }

    if (pattern.type === 'regex') {
      try {
        new RegExp(pattern.value);
      } catch (e) {
        return 'Invalid regular expression';
      }
    }

    return null;
  };

  const addPattern = () => {
    const newId = String(patterns.length + 1);
    setPatterns([...patterns, {
      id: newId,
      type: 'keyword',
      value: '',
      caseSensitive: false,
      wholeWord: false
    }]);
  };

  const removePattern = (id: string) => {
    if (patterns.length > 1) {
      setPatterns(patterns.filter(p => p.id !== id));
      const newErrors = { ...errors };
      delete newErrors[id];
      setErrors(newErrors);
    }
  };

  const updatePattern = (id: string, updates: Partial<TrackerPattern>) => {
    setPatterns(patterns.map(p =>
      p.id === id ? { ...p, ...updates } : p
    ));

    // Validate on change
    const pattern = patterns.find(p => p.id === id);
    if (pattern) {
      const updatedPattern = { ...pattern, ...updates };
      const error = validatePattern(updatedPattern);
      if (error) {
        setErrors({ ...errors, [id]: error });
      } else {
        const newErrors = { ...errors };
        delete newErrors[id];
        setErrors(newErrors);
      }
    }
  };

  const addExcludePattern = () => {
    setExcludePatterns([...excludePatterns, '']);
  };

  const removeExcludePattern = (index: number) => {
    setExcludePatterns(excludePatterns.filter((_, i) => i !== index));
  };

  const updateExcludePattern = (index: number, value: string) => {
    const updated = [...excludePatterns];
    updated[index] = value;
    setExcludePatterns(updated);
  };

  const testPatterns = () => {
    if (!testText.trim()) return;

    const results: any[] = [];
    patterns.forEach(pattern => {
      if (!pattern.value) return;

      let regex: RegExp;
      if (pattern.type === 'regex') {
        try {
          regex = new RegExp(pattern.value, pattern.caseSensitive ? 'g' : 'gi');
        } catch (e) {
          results.push({
            pattern: pattern.value,
            type: pattern.type,
            error: 'Invalid regex'
          });
          return;
        }
      } else {
        let regexPattern = pattern.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (pattern.wholeWord) {
          regexPattern = `\\b${regexPattern}\\b`;
        }
        regex = new RegExp(regexPattern, pattern.caseSensitive ? 'g' : 'gi');
      }

      const matches = Array.from(testText.matchAll(regex));
      results.push({
        pattern: pattern.value,
        type: pattern.type,
        matches: matches.length,
        positions: matches.map(m => ({
          index: m.index,
          match: m[0]
        }))
      });
    });

    setTestResults(results);
  };

  const handleSave = () => {
    // Validate all patterns
    const allErrors: { [key: string]: string } = {};
    patterns.forEach(pattern => {
      const error = validatePattern(pattern);
      if (error) {
        allErrors[pattern.id] = error;
      }
    });

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    if (!name.trim()) {
      alert('Please enter a tracker name');
      return;
    }

    const newTracker: Tracker = {
      id: tracker?.id || Date.now().toString(),
      name,
      description,
      patterns: patterns.filter(p => p.value.trim()),
      category,
      alertEnabled,
      alertThreshold,
      excludePatterns: excludePatterns.filter(p => p.trim()),
      contextWindow
    };

    onSave(newTracker);
  };

  return (
    <div className="card-ff">
      <h2 className="heading-m text-white mb-6">Tracker Builder</h2>

      {/* Basic Info */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tracker Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field w-full"
            placeholder="e.g., Competitor Mentions, Pricing Discussions"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field w-full"
            rows={2}
            placeholder="Describe what this tracker monitors..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field w-full"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pattern Builder */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-white">Detection Patterns</h3>
          <button
            onClick={addPattern}
            className="button-secondary text-sm flex items-center gap-1"
          >
            <Plus size={14} />
            Add Pattern
          </button>
        </div>

        <div className="space-y-3">
          {patterns.map(pattern => (
            <div key={pattern.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <select
                  value={pattern.type}
                  onChange={(e) => updatePattern(pattern.id, { type: e.target.value as any })}
                  className="input-field text-sm"
                >
                  <option value="keyword">Keyword</option>
                  <option value="phrase">Phrase</option>
                  <option value="regex">Regex</option>
                </select>

                <div className="flex-1">
                  <input
                    type="text"
                    value={pattern.value}
                    onChange={(e) => updatePattern(pattern.id, { value: e.target.value })}
                    className={`input-field w-full text-sm ${errors[pattern.id] ? 'border-red-500' : ''}`}
                    placeholder={
                      pattern.type === 'keyword' ? 'e.g., competitor' :
                      pattern.type === 'phrase' ? 'e.g., "our competitor"' :
                      'e.g., compet(e|itor|ing)'
                    }
                  />
                  {errors[pattern.id] && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {errors[pattern.id]}
                    </p>
                  )}
                </div>

                {patterns.length > 1 && (
                  <button
                    onClick={() => removePattern(pattern.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={pattern.caseSensitive}
                    onChange={(e) => updatePattern(pattern.id, { caseSensitive: e.target.checked })}
                    className="checkbox"
                  />
                  Case Sensitive
                </label>

                {pattern.type !== 'regex' && (
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={pattern.wholeWord}
                      onChange={(e) => updatePattern(pattern.id, { wholeWord: e.target.checked })}
                      className="checkbox"
                    />
                    Whole Word
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusion Patterns */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-white">Exclude Patterns</h3>
          <button
            onClick={addExcludePattern}
            className="button-secondary text-sm flex items-center gap-1"
          >
            <Plus size={14} />
            Add Exclusion
          </button>
        </div>

        {excludePatterns.length > 0 && (
          <div className="space-y-2">
            {excludePatterns.map((pattern, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => updateExcludePattern(index, e.target.value)}
                  className="input-field flex-1 text-sm"
                  placeholder="Pattern to exclude from matches"
                />
                <button
                  onClick={() => removeExcludePattern(index)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Configuration */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg">
        <label className="flex items-center gap-3 mb-3">
          <input
            type="checkbox"
            checked={alertEnabled}
            onChange={(e) => setAlertEnabled(e.target.checked)}
            className="checkbox"
          />
          <span className="font-medium text-white">Enable Alerts</span>
        </label>

        {alertEnabled && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Alert Threshold
              </label>
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                min="1"
                className="input-field w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Context Window (words)
              </label>
              <input
                type="number"
                value={contextWindow}
                onChange={(e) => setContextWindow(Number(e.target.value))}
                min="5"
                max="50"
                className="input-field w-full text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pattern Tester */}
      <div className="mb-6 p-4 bg-purple-500/10 rounded-lg">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <TestTube size={18} />
          Test Patterns
        </h3>

        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="input-field w-full text-sm mb-3"
          rows={4}
          placeholder="Enter sample text to test your patterns..."
        />

        <button
          onClick={testPatterns}
          className="button-secondary text-sm"
          disabled={!testText.trim() || patterns.every(p => !p.value.trim())}
        >
          Test Patterns
        </button>

        {testResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className="bg-white/5 rounded p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    {result.pattern} ({result.type})
                  </span>
                  {result.error ? (
                    <span className="text-red-400 text-sm">{result.error}</span>
                  ) : (
                    <span className="text-green-400 text-sm">
                      {result.matches} match{result.matches !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          className="button-primary flex items-center gap-2"
        >
          <Save size={18} />
          Save Tracker
        </button>
      </div>
    </div>
  );
}