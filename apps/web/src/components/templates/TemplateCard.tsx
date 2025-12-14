'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Hash,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Layers
} from 'lucide-react';
import { CardGlass, CardGlassContent } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApply: () => void;
  onDuplicate: () => void;
}

export default function TemplateCard({
  template,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onApply,
  onDuplicate
}: TemplateCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const getCategoryInfo = (category: string) => {
    const categoryData: Record<string, { color: string; icon: string; label: string }> = {
      sales: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '💼', label: 'Sales' },
      customer_success: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🤝', label: 'Customer Success' },
      internal: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '🏢', label: 'Internal' },
      interview: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '👥', label: 'Interview' },
      project: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', icon: '🚀', label: 'Project' },
      custom: { color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', icon: '✨', label: 'Custom' }
    };
    return categoryData[category] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: '📄', label: category };
  };

  const categoryInfo = getCategoryInfo(template.category);

  return (
    <CardGlass
      className={`relative transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
        isSelected ? 'ring-2 ring-[var(--ff-purple-500)]' : ''
      }`}
      onClick={onSelect}
    >
      <CardGlassContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--ff-purple-500)]/10 rounded-lg">
              <FileText className="w-5 h-5 text-[var(--ff-purple-500)]" />
            </div>
            <div className="flex-1">
              <h3 className="heading-s mb-1">{template.name}</h3>
              <p className="paragraph-s text-[var(--ff-text-muted)] line-clamp-2">
                {template.description}
              </p>
            </div>
          </div>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-[var(--ff-bg-layer)]"
            >
              <MoreVertical className="w-4 h-4 text-[var(--ff-text-muted)]" />
            </Button>

            {showMenu && (
              <div className="absolute right-0 top-8 z-20 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-xl shadow-2xl py-2 min-w-[180px] backdrop-blur-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApply();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--ff-purple-500)]/10 transition-colors flex items-center gap-3 text-[var(--ff-text-primary)]"
                >
                  <Check className="w-4 h-4 text-[var(--ff-purple-500)]" />
                  Apply Template
                </button>
                {!template.isPreBuilt && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--ff-purple-500)]/10 transition-colors flex items-center gap-3 text-[var(--ff-text-primary)]"
                  >
                    <Edit className="w-4 h-4 text-[var(--ff-text-muted)]" />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--ff-purple-500)]/10 transition-colors flex items-center gap-3 text-[var(--ff-text-primary)]"
                >
                  <Copy className="w-4 h-4 text-[var(--ff-text-muted)]" />
                  Duplicate
                </button>
                {!template.isPreBuilt && (
                  <>
                    <div className="border-t border-[var(--ff-border)] my-1" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.isPreBuilt && (
            <Badge variant="outline" className="bg-[var(--ff-purple-500)]/10 text-[var(--ff-purple-500)] border-[var(--ff-purple-500)]/20">
              <Star className="w-3 h-3 mr-1" />
              Pre-built
            </Badge>
          )}
          <Badge variant="outline" className={categoryInfo.color}>
            <span className="mr-1">{categoryInfo.icon}</span>
            {categoryInfo.label}
          </Badge>
        </div>

        {/* Variables Preview */}
        {template.variables.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-[var(--ff-text-muted)]" />
              <span className="text-xs text-[var(--ff-text-muted)]">Variables</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {template.variables.slice(0, isExpanded ? undefined : 3).map((variable, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-[var(--ff-purple-100)]/10 text-[var(--ff-purple-500)] rounded"
                >
                  {variable}
                </span>
              ))}
              {!isExpanded && template.variables.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
                  }}
                  className="text-xs text-[var(--ff-text-muted)] hover:text-[var(--ff-text-secondary)] transition-colors"
                >
                  +{template.variables.length - 3} more
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sections Preview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--ff-text-muted)]" />
              <span className="text-xs text-[var(--ff-text-muted)]">
                {template.sections.length} sections
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-[var(--ff-text-muted)] hover:text-[var(--ff-text-secondary)] transition-colors p-1 rounded hover:bg-[var(--ff-bg-layer)]"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
          {isExpanded && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--ff-border)] scrollbar-track-transparent pr-2">
              {template.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="text-xs text-[var(--ff-text-secondary)] pl-3 py-1 border-l-2 border-[var(--ff-purple-500)]/30 bg-[var(--ff-bg-layer)]/50 rounded-r"
                >
                  {section.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)] rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Stats */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--ff-border)]">
          <div className="flex items-center gap-2 text-xs text-[var(--ff-text-muted)]">
            <Users className="w-3 h-3" />
            <span>{template.usageCount} uses</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onApply();
            }}
            className="text-xs border-[var(--ff-purple-500)] text-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-500)] hover:text-white"
          >
            Use Template
          </Button>
        </div>
      </CardGlassContent>
    </CardGlass>
  );
}