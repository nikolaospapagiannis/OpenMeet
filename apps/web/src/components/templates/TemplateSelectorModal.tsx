'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Search,
  Clock,
  Star,
  FileText,
  Check,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  isPreBuilt: boolean;
  variables: string[];
  sections: Array<{
    title: string;
    content: string;
  }>;
  usageCount: number;
  tags: string[];
}

interface TemplateSelectorModalProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  onClose: () => void;
  recentlyUsedIds?: string[];
  favoriteIds?: string[];
}

export default function TemplateSelectorModal({
  templates,
  onSelect,
  onClose,
  recentlyUsedIds = [],
  favoriteIds = []
}: TemplateSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const categories = [
    { value: 'all', label: 'All', icon: FileText },
    { value: 'recent', label: 'Recently Used', icon: Clock },
    { value: 'favorites', label: 'Favorites', icon: Star },
    { value: 'sales', label: 'Sales' },
    { value: 'customer_success', label: 'Customer Success' },
    { value: 'internal', label: 'Internal' },
    { value: 'interview', label: 'Interview' },
    { value: 'project', label: 'Project' }
  ];

  useEffect(() => {
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCategory === 'all') return matchesSearch;
    if (selectedCategory === 'recent') return matchesSearch && recentlyUsedIds.includes(template.id);
    if (selectedCategory === 'favorites') return matchesSearch && favoriteIds.includes(template.id);

    return matchesSearch && template.category === selectedCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      sales: 'bg-blue-500/20 text-blue-400',
      customer_success: 'bg-green-500/20 text-green-400',
      internal: 'bg-purple-500/20 text-purple-400',
      interview: 'bg-orange-500/20 text-orange-400',
      project: 'bg-cyan-500/20 text-cyan-400',
      custom: 'bg-pink-500/20 text-pink-400'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-5xl mx-4 bg-[var(--ff-bg-dark)] border border-[var(--ff-border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[var(--ff-border)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-m">Select Template</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[var(--ff-text-muted)] hover:text-[var(--ff-text-primary)]"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="pl-10 bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)]"
            />
          </div>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar Categories */}
          <div className="w-48 border-r border-[var(--ff-border)] p-4">
            <div className="space-y-1">
              {categories.map(category => {
                const Icon = category.icon;
                const count = filteredTemplates.filter(t =>
                  category.value === 'all' ? true :
                  category.value === 'recent' ? recentlyUsedIds.includes(t.id) :
                  category.value === 'favorites' ? favoriteIds.includes(t.id) :
                  t.category === category.value
                ).length;

                return (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      selectedCategory === category.value
                        ? 'bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)]'
                        : 'hover:bg-[var(--ff-bg-layer)] text-[var(--ff-text-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4" />}
                      <span className="text-sm">{category.label}</span>
                    </div>
                    <span className="text-xs opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto text-[var(--ff-text-muted)] mb-4" />
                <p className="text-[var(--ff-text-muted)]">
                  {searchQuery
                    ? `No templates match "${searchQuery}"`
                    : 'No templates in this category'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredTemplates.map(template => {
                  const isRecent = recentlyUsedIds.includes(template.id);
                  const isFavorite = favoriteIds.includes(template.id);

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg hover:border-[var(--ff-purple-500)] transition-all text-left ${
                        selectedTemplate?.id === template.id
                          ? 'ring-2 ring-[var(--ff-purple-500)]'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[var(--ff-purple-500)]" />
                          <h3 className="text-sm font-semibold">{template.name}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          {isRecent && <Clock className="w-3 h-3 text-[var(--ff-text-muted)]" />}
                          {isFavorite && <Star className="w-3 h-3 text-yellow-400" />}
                        </div>
                      </div>

                      <p className="text-xs text-[var(--ff-text-muted)] mb-3 line-clamp-2">
                        {template.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {template.isPreBuilt && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)] border-[var(--ff-purple-500)]/20"
                          >
                            Pre-built
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCategoryColor(template.category)}`}
                        >
                          {template.category.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--ff-text-muted)]">
                        <span>{template.sections.length} sections</span>
                        <span>{template.usageCount} uses</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {selectedTemplate && (
            <div className="w-80 border-l border-[var(--ff-border)] p-4 overflow-y-auto">
              <h3 className="heading-s mb-4">{selectedTemplate.name}</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs text-[var(--ff-text-muted)] mb-2">Description</h4>
                  <p className="text-sm text-[var(--ff-text-secondary)]">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs text-[var(--ff-text-muted)] mb-2">Sections</h4>
                  <div className="space-y-2">
                    {selectedTemplate.sections.map((section, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <ChevronRight className="w-3 h-3 text-[var(--ff-text-muted)]" />
                        <span className="text-[var(--ff-text-secondary)]">{section.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[var(--ff-text-muted)] mb-2">Variables</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.variables.map((variable, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-[var(--ff-purple-100)]/10 text-[var(--ff-purple-500)] rounded"
                        >
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs text-[var(--ff-text-muted)] mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)] rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--ff-border)] flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
          >
            Cancel
          </Button>
          <Button
            onClick={() => selectedTemplate && onSelect(selectedTemplate)}
            disabled={!selectedTemplate}
            className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white disabled:opacity-50"
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Template
          </Button>
        </div>
      </div>
    </div>
  );
}