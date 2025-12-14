'use client';

import React, { useState } from 'react';
import {
  Lightbulb,
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  Circle,
  ArrowRight,
  BookOpen,
  Video,
  FileText,
  Download,
  Filter,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { ImprovementSuggestion } from '@/hooks/useQuality';

interface ImprovementSuggestionsProps {
  suggestions: ImprovementSuggestion[];
  onApplySuggestion?: (suggestionId: string) => void;
  onViewResource?: (resource: any) => void;
}

export default function ImprovementSuggestions({
  suggestions,
  onApplySuggestion,
  onViewResource
}: ImprovementSuggestionsProps) {
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedFactor, setSelectedFactor] = useState<string>('all');
  const [expandedSuggestions, setExpandedSuggestions] = useState<string[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>([]);

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (selectedPriority !== 'all' && s.priority !== selectedPriority) return false;
    if (selectedFactor !== 'all' && s.factor !== selectedFactor) return false;
    return true;
  });

  // Get unique factors
  const factors = ['all', ...new Set(suggestions.map(s => s.factor))];

  const toggleSuggestion = (id: string) => {
    setExpandedSuggestions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApply = (suggestionId: string) => {
    setAppliedSuggestions(prev => [...prev, suggestionId]);
    onApplySuggestion?.(suggestionId);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getImpactIcon = (impact: 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'high':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'medium':
        return <ArrowRight className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEffortIcon = (effort: 'high' | 'medium' | 'low') => {
    switch (effort) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Zap className="w-4 h-4 text-green-600" />;
    }
  };

  const getResourceIcon = (type: 'article' | 'video' | 'template' | 'guide') => {
    switch (type) {
      case 'article':
        return <BookOpen className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'template':
        return <FileText className="w-4 h-4" />;
      case 'guide':
        return <Download className="w-4 h-4" />;
    }
  };

  // Calculate total potential improvement
  const totalPotentialImprovement = filteredSuggestions.reduce(
    (sum, s) => sum + s.estimatedImprovement,
    0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center space-x-2">
              <Lightbulb className="w-7 h-7" />
              <span>AI-Powered Improvement Plan</span>
            </h2>
            <p className="text-purple-100">
              Personalized recommendations to boost your meeting quality
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">+{totalPotentialImprovement.toFixed(0)}</div>
            <div className="text-sm text-purple-100">Potential score increase</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
          {/* Priority Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Priority:</span>
            <div className="flex items-center space-x-1">
              {(['all', 'high', 'medium', 'low'] as const).map(priority => (
                <button
                  key={priority}
                  onClick={() => setSelectedPriority(priority)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedPriority === priority
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Factor Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Factor:</span>
            <select
              value={selectedFactor}
              onChange={(e) => setSelectedFactor(e.target.value)}
              className="px-3 py-1 rounded-lg text-sm bg-gray-100 border-0 focus:ring-2 focus:ring-purple-500"
            >
              {factors.map(factor => (
                <option key={factor} value={factor}>
                  {factor === 'all' ? 'All Factors' : factor}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Stats */}
          <div className="ml-auto flex items-center space-x-4 text-sm">
            <div className="text-gray-600">
              <span className="font-semibold">{filteredSuggestions.length}</span> suggestions
            </div>
            <div className="text-green-600">
              <span className="font-semibold">{appliedSuggestions.length}</span> applied
            </div>
          </div>
        </div>

        {/* Suggestions List */}
        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => {
            const isExpanded = expandedSuggestions.includes(suggestion.id);
            const isApplied = appliedSuggestions.includes(suggestion.id);

            return (
              <div
                key={suggestion.id}
                className={`rounded-lg border-2 transition-all ${
                  isApplied
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                }`}
              >
                {/* Suggestion Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleSuggestion(suggestion.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title and Priority */}
                      <div className="flex items-start space-x-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {suggestion.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-3">
                            {suggestion.description}
                          </p>

                          {/* Metrics */}
                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(suggestion.priority)}`}>
                              {suggestion.priority} priority
                            </span>
                            <div className="flex items-center space-x-1">
                              {getImpactIcon(suggestion.impact)}
                              <span className="text-gray-600">
                                {suggestion.impact} impact
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getEffortIcon(suggestion.effort)}
                              <span className="text-gray-600">
                                {suggestion.effort} effort
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 text-green-600 font-medium">
                              <TrendingUp className="w-3 h-3" />
                              <span>+{suggestion.estimatedImprovement} points</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status and Expand Icon */}
                    <div className="flex items-center space-x-2 ml-4">
                      {isApplied && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-4">
                      {/* Action Items */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          <span>Action Items</span>
                        </h4>
                        <ul className="space-y-2">
                          {suggestion.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                checked={isApplied}
                                readOnly
                              />
                              <span className="text-sm text-gray-700">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Resources */}
                      {suggestion.resources.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Helpful Resources</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {suggestion.resources.map((resource, idx) => (
                              <button
                                key={idx}
                                onClick={() => onViewResource?.(resource)}
                                className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 text-left"
                              >
                                {getResourceIcon(resource.type)}
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {resource.title}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {resource.type}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Apply Button */}
                      {!isApplied && (
                        <button
                          onClick={() => handleApply(suggestion.id)}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark as Applied</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredSuggestions.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No suggestions found</h3>
            <p className="text-sm text-gray-600">
              Try adjusting your filters to see more recommendations
            </p>
          </div>
        )}

        {/* Summary */}
        {filteredSuggestions.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Implementation Summary</h4>
                <p className="text-sm text-gray-600">
                  Complete all high-priority suggestions for maximum impact
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((appliedSuggestions.length / filteredSuggestions.length) * 100)}%
                </div>
                <div className="text-xs text-gray-600">completed</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-purple-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(appliedSuggestions.length / filteredSuggestions.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}