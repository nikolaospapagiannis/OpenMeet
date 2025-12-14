'use client';

import { TrendingUp, Headphones, Users, UserCheck, Award, Plus } from 'lucide-react';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle,
  CardGlassDescription
} from '@/components/ui/card-glass';

interface Template {
  type: string;
  name: string;
  description: string;
  icon: string;
  criteria: number;
}

interface TemplateSelectorProps {
  templates: Template[];
  onSelectTemplate: (template: Template) => void;
  isLoading: boolean;
}

export function TemplateSelector({ templates, onSelectTemplate, isLoading }: TemplateSelectorProps) {
  const getIconComponent = (iconName: string) => {
    const icons: { [key: string]: any } = {
      TrendingUp,
      Headphones,
      Users,
      UserCheck,
      Award
    };
    const Icon = icons[iconName] || TrendingUp;
    return <Icon className="h-12 w-12" />;
  };

  const getTemplateColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      sales: '#22c55e',
      support: '#3b82f6',
      leadership: '#a855f7',
      recruiting: '#f59e0b',
      customer_success: '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div>
      {/* Pre-built Templates */}
      <div className="mb-8">
        <h2 className="heading-s text-[var(--ff-text-primary)] mb-4">
          Choose a Template
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <CardGlass
              key={template.type}
              className="hover:border-[var(--ff-purple-500)] transition-all cursor-pointer"
              onClick={() => !isLoading && onSelectTemplate(template)}
            >
              <CardGlassHeader>
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${getTemplateColor(template.type)}20` }}
                >
                  <div style={{ color: getTemplateColor(template.type) }}>
                    {getIconComponent(template.icon)}
                  </div>
                </div>
                <CardGlassTitle>{template.name}</CardGlassTitle>
                <CardGlassDescription className="mt-2">
                  {template.description}
                </CardGlassDescription>
              </CardGlassHeader>
              <CardGlassContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--ff-text-muted)]">
                    {template.criteria} evaluation criteria
                  </span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < Math.ceil(template.criteria / 2)
                            ? 'bg-[var(--ff-purple-500)]'
                            : 'bg-[var(--ff-border)]'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>
          ))}

          {/* Create Custom Option */}
          <CardGlass
            className="hover:border-[var(--ff-purple-500)] transition-all cursor-pointer border-dashed"
            onClick={() => !isLoading && onSelectTemplate({
              type: 'custom',
              name: 'Custom Scorecard',
              description: 'Build your own evaluation criteria',
              icon: 'Plus',
              criteria: 0
            })}
          >
            <CardGlassHeader>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-[var(--ff-purple-500)]/10">
                <Plus className="h-12 w-12 text-[var(--ff-purple-500)]" />
              </div>
              <CardGlassTitle>Create Custom</CardGlassTitle>
              <CardGlassDescription className="mt-2">
                Build your own evaluation framework with custom criteria
              </CardGlassDescription>
            </CardGlassHeader>
            <CardGlassContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--ff-text-muted)]">
                  Fully customizable
                </span>
                <div className="px-3 py-1 bg-[var(--ff-purple-500)]/10 rounded-full">
                  <span className="text-xs text-[var(--ff-purple-500)] font-semibold">
                    Advanced
                  </span>
                </div>
              </div>
            </CardGlassContent>
          </CardGlass>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--ff-bg-layer)] p-6 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[var(--ff-purple-500)] rounded-full animate-pulse" />
              <p className="text-[var(--ff-text-primary)]">Loading templates...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}