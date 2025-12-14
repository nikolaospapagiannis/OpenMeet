'use client';

/**
 * AI Agenda Suggestions Component
 * Displays AI-generated agenda suggestions based on meeting context
 */

import React from 'react';
import { Sparkles, Plus, TrendingUp } from 'lucide-react';

interface AgendaSuggestion {
  title: string;
  reasoning: string;
  confidence: number;
}

interface AgendaSuggestionsProps {
  suggestions: AgendaSuggestion[];
  onAddSuggestion: (suggestion: AgendaSuggestion) => void;
  context?: {
    previousMeetingsAnalyzed: number;
    openActionItemsFound: number;
    templateUsed?: string;
  };
  loading?: boolean;
}

export default function AgendaSuggestions({
  suggestions,
  onAddSuggestion,
  context,
  loading = false
}: AgendaSuggestionsProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-blue-200 rounded w-1/3" />
          <div className="h-4 bg-blue-100 rounded" />
          <div className="h-4 bg-blue-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No AI suggestions available yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Generate an agenda to see intelligent suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">AI-Powered Suggestions</h3>
        </div>
        {context && (
          <div className="flex items-center space-x-4 text-sm opacity-90">
            {context.previousMeetingsAnalyzed > 0 && (
              <span>📊 {context.previousMeetingsAnalyzed} meetings analyzed</span>
            )}
            {context.openActionItemsFound > 0 && (
              <span>✓ {context.openActionItemsFound} open action items</span>
            )}
            {context.templateUsed && (
              <span>📋 {context.templateUsed}</span>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {suggestion.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {suggestion.reasoning}
                </p>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-500">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onAddSuggestion(suggestion)}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
