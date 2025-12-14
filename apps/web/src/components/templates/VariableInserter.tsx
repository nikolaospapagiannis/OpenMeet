'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Hash,
  Calendar,
  Clock,
  Users,
  Briefcase,
  Target,
  User,
  Building,
  FileText,
  Settings,
  Info,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface VariableCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  variables: Variable[];
}

interface Variable {
  name: string;
  description: string;
  example: string;
  usage: number;
  required?: boolean;
  deprecated?: boolean;
}

interface VariableInserterProps {
  onInsert: (variable: string) => void;
  usedVariables: string[];
  customVariables?: Variable[];
  onCreateCustom?: (variable: Variable) => void;
  position?: 'inline' | 'modal';
}

export default function VariableInserter({
  onInsert,
  usedVariables,
  customVariables = [],
  onCreateCustom,
  position = 'inline'
}: VariableInserterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['meeting']));
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVariable, setNewVariable] = useState<Variable>({
    name: '',
    description: '',
    example: '',
    usage: 0
  });
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [favoriteVariables, setFavoriteVariables] = useState<Set<string>>(new Set());

  // Predefined variable categories with enhanced metadata
  const variableCategories: VariableCategory[] = [
    {
      id: 'meeting',
      name: 'Meeting Details',
      icon: Calendar,
      description: 'Basic meeting information',
      variables: [
        {
          name: '{{meeting.title}}',
          description: 'The title of the meeting',
          example: 'Q4 Planning Review',
          usage: 145,
          required: true
        },
        {
          name: '{{meeting.date}}',
          description: 'Date of the meeting',
          example: 'December 9, 2024',
          usage: 142,
          required: true
        },
        {
          name: '{{meeting.time}}',
          description: 'Start time of the meeting',
          example: '2:00 PM EST',
          usage: 89
        },
        {
          name: '{{meeting.duration}}',
          description: 'Duration in minutes',
          example: '60 minutes',
          usage: 67
        },
        {
          name: '{{meeting.platform}}',
          description: 'Meeting platform (Zoom, Teams, etc)',
          example: 'Zoom',
          usage: 45
        },
        {
          name: '{{meeting.link}}',
          description: 'Meeting URL',
          example: 'https://zoom.us/j/123456',
          usage: 38
        },
        {
          name: '{{meeting.id}}',
          description: 'Unique meeting identifier',
          example: 'MTG-2024-001',
          usage: 22
        }
      ]
    },
    {
      id: 'participants',
      name: 'Participants',
      icon: Users,
      description: 'Meeting attendees and roles',
      variables: [
        {
          name: '{{participant.names}}',
          description: 'List of all participant names',
          example: 'John Doe, Jane Smith, Bob Johnson',
          usage: 112
        },
        {
          name: '{{participant.count}}',
          description: 'Number of participants',
          example: '5',
          usage: 45
        },
        {
          name: '{{participant.organizer}}',
          description: 'Meeting organizer name',
          example: 'Sarah Wilson',
          usage: 78
        },
        {
          name: '{{participant.presenter}}',
          description: 'Primary presenter',
          example: 'Michael Chen',
          usage: 34
        },
        {
          name: '{{participant.emails}}',
          description: 'Participant email addresses',
          example: 'john@example.com, jane@example.com',
          usage: 29
        },
        {
          name: '{{participant.roles}}',
          description: 'Participant roles in meeting',
          example: 'Host, Presenter, Attendee',
          usage: 18
        }
      ]
    },
    {
      id: 'company',
      name: 'Company',
      icon: Building,
      description: 'Organization and business context',
      variables: [
        {
          name: '{{company.name}}',
          description: 'Company or client name',
          example: 'Acme Corporation',
          usage: 98
        },
        {
          name: '{{company.department}}',
          description: 'Department or team',
          example: 'Engineering',
          usage: 56
        },
        {
          name: '{{company.project}}',
          description: 'Project name',
          example: 'Project Phoenix',
          usage: 67
        },
        {
          name: '{{company.quarter}}',
          description: 'Current quarter',
          example: 'Q4 2024',
          usage: 43
        },
        {
          name: '{{company.fiscal_year}}',
          description: 'Fiscal year',
          example: 'FY2024',
          usage: 21
        }
      ]
    },
    {
      id: 'sales',
      name: 'Sales',
      icon: Target,
      description: 'Sales-specific variables',
      variables: [
        {
          name: '{{sales.prospect}}',
          description: 'Prospect company name',
          example: 'TechCorp Solutions',
          usage: 45
        },
        {
          name: '{{sales.contact}}',
          description: 'Primary contact name',
          example: 'David Kim',
          usage: 42
        },
        {
          name: '{{sales.stage}}',
          description: 'Current sales stage',
          example: 'Discovery',
          usage: 38
        },
        {
          name: '{{sales.value}}',
          description: 'Deal value',
          example: '$50,000',
          usage: 31
        },
        {
          name: '{{sales.product}}',
          description: 'Product being discussed',
          example: 'Enterprise Plan',
          usage: 29
        },
        {
          name: '{{sales.competitor}}',
          description: 'Competitor mentioned',
          example: 'Competitor X',
          usage: 15
        }
      ]
    },
    {
      id: 'interview',
      name: 'Interview',
      icon: User,
      description: 'Recruitment and interview variables',
      variables: [
        {
          name: '{{interview.candidate}}',
          description: 'Candidate name',
          example: 'Emily Rodriguez',
          usage: 34
        },
        {
          name: '{{interview.position}}',
          description: 'Position title',
          example: 'Senior Software Engineer',
          usage: 32
        },
        {
          name: '{{interview.round}}',
          description: 'Interview round',
          example: 'Technical Round 2',
          usage: 28
        },
        {
          name: '{{interview.interviewer}}',
          description: 'Interviewer name',
          example: 'Mark Thompson',
          usage: 26
        },
        {
          name: '{{interview.skills}}',
          description: 'Key skills discussed',
          example: 'React, Node.js, AWS',
          usage: 19
        }
      ]
    },
    {
      id: 'project',
      name: 'Project',
      icon: Briefcase,
      description: 'Project management variables',
      variables: [
        {
          name: '{{project.name}}',
          description: 'Project name',
          example: 'Website Redesign',
          usage: 54
        },
        {
          name: '{{project.sprint}}',
          description: 'Current sprint',
          example: 'Sprint 14',
          usage: 41
        },
        {
          name: '{{project.milestone}}',
          description: 'Current milestone',
          example: 'Beta Release',
          usage: 35
        },
        {
          name: '{{project.deadline}}',
          description: 'Project deadline',
          example: 'March 31, 2025',
          usage: 32
        },
        {
          name: '{{project.status}}',
          description: 'Project status',
          example: 'On Track',
          usage: 29
        },
        {
          name: '{{project.budget}}',
          description: 'Project budget',
          example: '$100,000',
          usage: 18
        }
      ]
    },
    {
      id: 'custom',
      name: 'Custom Variables',
      icon: Settings,
      description: 'User-defined custom variables',
      variables: customVariables
    }
  ];

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('templateVariableFavorites');
    if (saved) {
      setFavoriteVariables(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (variableName: string) => {
    const newFavorites = new Set(favoriteVariables);
    if (newFavorites.has(variableName)) {
      newFavorites.delete(variableName);
    } else {
      newFavorites.add(variableName);
    }
    setFavoriteVariables(newFavorites);
    localStorage.setItem('templateVariableFavorites', JSON.stringify(Array.from(newFavorites)));
  };

  // Track recently used variables
  const handleInsert = (variable: string) => {
    onInsert(variable);
    setRecentlyUsed(prev => {
      const updated = [variable, ...prev.filter(v => v !== variable)].slice(0, 5);
      localStorage.setItem('templateVariablesRecent', JSON.stringify(updated));
      return updated;
    });
  };

  // Load recently used from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('templateVariablesRecent');
    if (saved) {
      setRecentlyUsed(JSON.parse(saved));
    }
  }, []);

  // Filter variables based on search
  const filterVariables = (variables: Variable[]) => {
    if (!searchQuery) return variables;
    const query = searchQuery.toLowerCase();
    return variables.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.description.toLowerCase().includes(query) ||
      v.example.toLowerCase().includes(query)
    );
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Create custom variable
  const handleCreateCustom = () => {
    if (!newVariable.name || !newVariable.description) return;

    const formattedVariable: Variable = {
      ...newVariable,
      name: `{{${newVariable.name.replace(/[{}]/g, '')}}}`,
      usage: 0
    };

    onCreateCustom?.(formattedVariable);
    setShowCreateDialog(false);
    setNewVariable({ name: '', description: '', example: '', usage: 0 });
  };

  // Get all favorite variables
  const getFavoriteVariables = () => {
    const favorites: Variable[] = [];
    variableCategories.forEach(category => {
      category.variables.forEach(variable => {
        if (favoriteVariables.has(variable.name)) {
          favorites.push(variable);
        }
      });
    });
    return favorites;
  };

  const renderContent = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
        <Input
          type="text"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create Custom
        </Button>
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && !searchQuery && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--ff-text-muted)]">Recently Used</h4>
          <div className="flex flex-wrap gap-1">
            {recentlyUsed.map(variable => (
              <Badge
                key={variable}
                variant="outline"
                className="cursor-pointer hover:bg-[var(--ff-purple-500)]/10 transition-colors border-[var(--ff-border)]"
                onClick={() => handleInsert(variable)}
              >
                {variable}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {getFavoriteVariables().length > 0 && !searchQuery && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-[var(--ff-text-muted)]">Favorites</h4>
          <div className="flex flex-wrap gap-1">
            {getFavoriteVariables().map(variable => (
              <Badge
                key={variable.name}
                variant="outline"
                className="cursor-pointer hover:bg-[var(--ff-purple-500)]/10 transition-colors border-[var(--ff-purple-500)]/50 text-[var(--ff-purple-500)]"
                onClick={() => handleInsert(variable.name)}
              >
                {variable.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {variableCategories.map(category => {
          const filtered = filterVariables(category.variables);
          if (filtered.length === 0 && searchQuery) return null;

          return (
            <div key={category.id} className="border border-[var(--ff-border)] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--ff-bg-layer)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <category.icon className="w-4 h-4 text-[var(--ff-text-secondary)]" />
                  <div className="text-left">
                    <div className="text-sm font-medium text-[var(--ff-text-primary)]">
                      {category.name}
                    </div>
                    <div className="text-xs text-[var(--ff-text-muted)]">
                      {category.description}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {filtered.length}
                  </Badge>
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4 text-[var(--ff-text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--ff-text-muted)]" />
                  )}
                </div>
              </button>

              {expandedCategories.has(category.id) && (
                <div className="p-3 pt-0 space-y-2">
                  {filtered.map(variable => (
                    <div
                      key={variable.name}
                      className="group relative p-3 rounded-lg bg-[var(--ff-bg-layer)] hover:bg-[var(--ff-bg-layer)]/80 transition-colors cursor-pointer"
                      onClick={() => handleInsert(variable.name)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-[var(--ff-purple-500)] font-mono">
                              {variable.name}
                            </code>
                            {variable.required && (
                              <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
                                Required
                              </Badge>
                            )}
                            {variable.deprecated && (
                              <Badge variant="outline" className="text-xs border-red-500 text-red-500">
                                Deprecated
                              </Badge>
                            )}
                            {usedVariables.includes(variable.name) && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-[var(--ff-text-secondary)] mt-1">
                            {variable.description}
                          </p>
                          {variable.example && (
                            <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                              Example: <span className="text-[var(--ff-text-secondary)]">{variable.example}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--ff-text-muted)]">
                            Used {variable.usage} times
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(variable.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {favoriteVariables.has(variable.name) ? (
                              <span className="text-yellow-500">★</span>
                            ) : (
                              <span className="text-[var(--ff-text-muted)]">☆</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Custom Variable Dialog */}
      {showCreateDialog && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Variable</DialogTitle>
              <DialogDescription>
                Define a new custom variable for your templates
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Variable Name</label>
                <Input
                  placeholder="e.g., customer_id"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  placeholder="What does this variable represent?"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Example Value</label>
                <Input
                  placeholder="e.g., CUST-12345"
                  value={newVariable.example}
                  onChange={(e) => setNewVariable({ ...newVariable, example: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCustom}
                  disabled={!newVariable.name || !newVariable.description}
                  className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                >
                  Create Variable
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  if (position === 'modal') {
    return renderContent();
  }

  return (
    <CardGlass>
      <CardGlassHeader>
        <CardGlassTitle className="flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Variable Inserter
        </CardGlassTitle>
      </CardGlassHeader>
      <CardGlassContent>
        {renderContent()}
      </CardGlassContent>
    </CardGlass>
  );
}