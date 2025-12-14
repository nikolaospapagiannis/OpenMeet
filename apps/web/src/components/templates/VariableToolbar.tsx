'use client';

import { useState } from 'react';
import {
  Hash,
  Copy,
  Search,
  Info,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface VariableToolbarProps {
  availableVariables: string[];
  onInsert: (variable: string) => void;
  usedVariables: string[];
}

export default function VariableToolbar({
  availableVariables,
  onInsert,
  usedVariables
}: VariableToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['common']));
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Categorize variables
  const variableCategories = {
    common: [
      '{{meeting_title}}',
      '{{date}}',
      '{{time}}',
      '{{duration}}',
      '{{attendees}}',
      '{{organizer}}'
    ],
    platform: [
      '{{platform}}',
      '{{meeting_link}}'
    ],
    sales: [
      '{{company}}',
      '{{prospect_name}}',
      '{{customer}}',
      '{{account_manager}}'
    ],
    team: [
      '{{employee}}',
      '{{manager}}',
      '{{team}}',
      '{{facilitator}}'
    ],
    project: [
      '{{sprint}}',
      '{{quarter}}',
      '{{year}}',
      '{{velocity}}'
    ],
    interview: [
      '{{candidate}}',
      '{{position}}',
      '{{interviewer}}'
    ],
    demo: [
      '{{product}}',
      '{{features_shown}}'
    ]
  };

  const handleCopy = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVariable(variable);
    setTimeout(() => setCopiedVariable(null), 2000);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredVariables = (variables: string[]) => {
    if (!searchQuery) return variables;
    return variables.filter(v =>
      v.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <CardGlassTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Variables
        </CardGlassTitle>
      </CardGlassHeader>
      <CardGlassContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
          <Input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-sm"
          />
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 mb-4 p-3 bg-[var(--ff-purple-500)]/10 rounded-lg">
          <Info className="w-4 h-4 text-[var(--ff-purple-500)] mt-0.5" />
          <div className="text-xs text-[var(--ff-text-secondary)]">
            Click to insert variables into your template. Variables will be replaced with actual values when applied.
          </div>
        </div>

        {/* Used Variables */}
        {usedVariables.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-[var(--ff-text-muted)] mb-2">Currently Used</div>
            <div className="flex flex-wrap gap-1">
              {usedVariables.map(variable => (
                <Badge
                  key={variable}
                  variant="outline"
                  className="text-xs bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)] border-[var(--ff-purple-500)]/20"
                >
                  {variable}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Variable Categories */}
        <div className="space-y-2">
          {Object.entries(variableCategories).map(([category, variables]) => {
            const filtered = filteredVariables(variables);
            if (filtered.length === 0 && searchQuery) return null;

            return (
              <div key={category} className="border border-[var(--ff-border)] rounded-lg">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[var(--ff-bg-layer)] transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--ff-text-primary)]">
                    {getCategoryLabel(category)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--ff-text-muted)]">
                      {filtered.length} variables
                    </span>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-4 h-4 text-[var(--ff-text-muted)]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[var(--ff-text-muted)]" />
                    )}
                  </div>
                </button>

                {expandedCategories.has(category) && (
                  <div className="p-3 pt-0 grid grid-cols-1 gap-2">
                    {filtered.map(variable => {
                      const isUsed = usedVariables.includes(variable);
                      const isCopied = copiedVariable === variable;

                      return (
                        <div
                          key={variable}
                          className={`flex items-center justify-between p-2 rounded-lg bg-[var(--ff-bg-layer)] hover:bg-[var(--ff-bg-layer)]/80 transition-colors ${
                            isUsed ? 'ring-1 ring-[var(--ff-purple-500)]' : ''
                          }`}
                        >
                          <button
                            onClick={() => onInsert(variable)}
                            className="flex-1 text-left"
                          >
                            <code className="text-xs text-[var(--ff-text-secondary)]">
                              {variable}
                            </code>
                          </button>
                          <div className="flex items-center gap-1">
                            {isUsed && (
                              <Badge
                                variant="outline"
                                className="text-xs border-[var(--ff-purple-500)]/20 text-[var(--ff-purple-500)]"
                              >
                                Used
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(variable)}
                              className="p-1 hover:bg-[var(--ff-bg-dark)]"
                            >
                              {isCopied ? (
                                <span className="text-xs text-green-400">Copied!</span>
                              ) : (
                                <Copy className="w-3 h-3 text-[var(--ff-text-muted)]" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardGlassContent>
    </CardGlass>
  );
}