'use client';

import { useState, useMemo } from 'react';
import TemplateCard from './TemplateCard';

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

interface TemplateGalleryProps {
  templates: Template[];
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
  onDuplicate: (template: Template) => void;
  groupByCategory?: boolean;
}

const categoryConfig: Record<string, { icon: string; label: string }> = {
  sales: { icon: '💼', label: 'Sales' },
  customer_success: { icon: '🤝', label: 'Customer Success' },
  internal: { icon: '🏢', label: 'Internal' },
  interview: { icon: '👥', label: 'Interview' },
  project: { icon: '🚀', label: 'Project' },
  custom: { icon: '✨', label: 'Custom' }
};

export default function TemplateGallery({
  templates,
  onEdit,
  onDelete,
  onApply,
  onDuplicate,
  groupByCategory = false
}: TemplateGalleryProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Group templates by category if needed
  const groupedTemplates = useMemo(() => {
    if (!groupByCategory) return null;

    const groups: Record<string, Template[]> = {};
    templates.forEach(template => {
      const category = template.category || 'other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(template);
    });
    return groups;
  }, [templates, groupByCategory]);

  const renderTemplateCard = (template: Template, index: number) => (
    <div
      key={template.id}
      className="animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <TemplateCard
        template={template}
        isSelected={selectedTemplate === template.id}
        onSelect={() => setSelectedTemplate(
          selectedTemplate === template.id ? null : template.id
        )}
        onEdit={() => onEdit(template)}
        onDelete={() => onDelete(template.id)}
        onApply={() => onApply(template.id)}
        onDuplicate={() => onDuplicate(template)}
      />
    </div>
  );

  if (groupByCategory && groupedTemplates) {
    return (
      <div className="space-y-10">
        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
          const config = categoryConfig[category] || { icon: '📄', label: category };
          return (
            <div key={category}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{config.icon}</span>
                <h2 className="text-xl font-semibold text-[var(--ff-text-primary)]">
                  {config.label}
                </h2>
                <span className="text-sm text-[var(--ff-text-muted)] bg-[var(--ff-bg-layer)] px-2 py-0.5 rounded-full">
                  {categoryTemplates.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryTemplates.map((template, idx) => renderTemplateCard(template, idx))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template, idx) => renderTemplateCard(template, idx))}
    </div>
  );
}