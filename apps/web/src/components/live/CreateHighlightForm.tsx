/**
 * Create Highlight Form Component
 * Form for manually creating highlights during meetings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LiveHighlight } from '../../hooks/useLiveHighlights';

interface CreateHighlightFormProps {
  onCreateHighlight: (data: {
    category: LiveHighlight['type'];
    text?: string;
    timestamp?: number;
    tags?: string[];
  }) => Promise<LiveHighlight>;
  currentTime?: number;
  isCompact?: boolean;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: 'action_item', label: 'Action Item', icon: '✓', color: '#f97316' },
  { value: 'decision', label: 'Decision', icon: '◆', color: '#22c55e' },
  { value: 'question', label: 'Question', icon: '?', color: '#3b82f6' },
  { value: 'key_moment', label: 'Key Moment', icon: '★', color: '#7a5af8' },
  { value: 'manual', label: 'Manual Note', icon: '✎', color: '#94a3b8' },
];

export const CreateHighlightForm: React.FC<CreateHighlightFormProps> = ({
  onCreateHighlight,
  currentTime = 0,
  isCompact = false,
  onCancel,
}) => {
  const [category, setCategory] = useState<LiveHighlight['type']>('key_moment');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Format current time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim() && !isCompact) {
      setError('Please enter a description');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tagArray = tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      await onCreateHighlight({
        category,
        text: text.trim(),
        timestamp: currentTime,
        tags: tagArray,
      });

      // Reset form
      setText('');
      setTags('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // In compact mode, reset to default category
      if (isCompact) {
        setCategory('key_moment');
      }
    } catch (err: any) {
      console.error('Error creating highlight:', err);
      setError(err.message || 'Failed to create highlight');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl+H to focus on the form
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        const textArea = document.getElementById('highlight-text') as HTMLTextAreaElement;
        if (textArea) {
          textArea.focus();
        }
      }

      // Escape to cancel (if onCancel provided)
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onCancel]);

  if (isCompact) {
    // Compact inline form
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as LiveHighlight['type'])}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-purple-500"
        >
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Quick note (optional)"
          className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />

        <span className="text-xs text-gray-500">
          {formatTime(currentTime)}
        </span>

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          title="Create highlight (Ctrl+H)"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving
            </span>
          ) : showSuccess ? (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Saved
            </span>
          ) : (
            'Mark'
          )}
        </button>

        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </form>
    );
  }

  // Full form
  return (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Create Highlight</h3>
          <span className="text-xs text-gray-500">
            At {formatTime(currentTime)}
          </span>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value as LiveHighlight['type'])}
                className={`
                  px-3 py-2 rounded-md text-xs font-medium transition-all
                  ${category === cat.value
                    ? 'ring-2 ring-offset-2 ring-offset-gray-900'
                    : 'hover:bg-gray-800'
                  }
                `}
                style={{
                  backgroundColor: category === cat.value ? `${cat.color}20` : 'transparent',
                  borderColor: category === cat.value ? cat.color : 'transparent',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: category === cat.value ? cat.color : '#9ca3af',
                }}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label htmlFor="highlight-text" className="block text-xs font-medium text-gray-400 mb-1">
            Description
          </label>
          <textarea
            id="highlight-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the highlight..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Tags Input */}
        <div>
          <label htmlFor="highlight-tags" className="block text-xs font-medium text-gray-400 mb-1">
            Tags (optional)
          </label>
          <input
            id="highlight-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tag1, tag2, tag3"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate tags with commas
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-md">
            <p className="text-xs text-green-400">Highlight created successfully!</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-500">
            Tip: Press <kbd className="px-1 py-0.5 bg-gray-800 rounded">Ctrl+H</kbd> to quickly create highlights
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || (!text.trim())}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Highlight
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateHighlightForm;