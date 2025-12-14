'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Star,
  Clock,
  Hash,
  Edit,
  Copy,
  Trash2,
  X,
  Check
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle,
  CardGlassDescription
} from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import TemplateGallery from '@/components/templates/TemplateGallery';
import TemplateBuilder from '@/components/templates/TemplateBuilder';
import TemplateSelectorModal from '@/components/templates/TemplateSelectorModal';
import TemplateManagement from '@/components/templates/TemplateManagement';

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

export default function TemplatesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const categories = [
    { value: 'all', label: 'All Templates', icon: '📋', color: 'purple' },
    { value: 'sales', label: 'Sales', icon: '💼', color: 'blue' },
    { value: 'customer_success', label: 'Customer Success', icon: '🤝', color: 'green' },
    { value: 'internal', label: 'Internal', icon: '🏢', color: 'purple' },
    { value: 'interview', label: 'Interview', icon: '👥', color: 'orange' },
    { value: 'project', label: 'Project', icon: '🚀', color: 'cyan' },
    { value: 'custom', label: 'My Templates', icon: '✨', color: 'pink' }
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/templates');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    try {
      const response = await apiClient.post('/templates', templateData);
      if (response.data.success) {
        setTemplates([response.data.template, ...templates]);
        setShowBuilder(false);
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async (id: string, templateData: any) => {
    try {
      const response = await apiClient.patch(`/templates/${id}`, templateData);
      if (response.data.success) {
        setTemplates(templates.map(t =>
          t.id === id ? response.data.template : t
        ));
        setShowBuilder(false);
        setEditingTemplate(null);
      }
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await apiClient.delete(`/templates/${id}`);
      if (response.data.success) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleApplyTemplate = async (templateId: string, meetingId?: string) => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/apply`, {
        meetingId: meetingId || 'new',
        variableValues: {
          meeting_title: 'New Meeting',
          date: new Date().toLocaleDateString(),
          attendees: user?.email || '',
        }
      });

      if (response.data.success) {
        // Navigate to meeting notes with applied template
        router.push(`/meetings/${meetingId || 'new'}?template=${templateId}`);
      }
    } catch (error) {
      console.error('Error applying template:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' ||
                           template.category === selectedCategory ||
                           (selectedCategory === 'custom' && !template.isPreBuilt);

    return matchesSearch && matchesCategory;
  });

  if (showBuilder) {
    return (
      <TemplateManagement
        templateId={editingTemplate?.id}
        onClose={() => {
          setShowBuilder(false);
          setEditingTemplate(null);
        }}
        onSave={(template) => {
          setShowBuilder(false);
          setEditingTemplate(null);
          fetchTemplates();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] text-[var(--ff-text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--ff-bg-dark)]/95 backdrop-blur-sm border-b border-[var(--ff-border)]">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[var(--ff-text-primary)]">
                <FileText className="inline-block w-8 h-8 mr-3 text-[var(--ff-purple-500)]" />
                Note Templates
              </h1>
              <p className="text-[var(--ff-text-muted)] mt-2 ml-11">
                Create and manage note templates for different meeting types
              </p>
            </div>
            <Button
              onClick={() => setShowBuilder(true)}
              className="bg-gradient-to-r from-[var(--ff-purple-500)] to-[var(--ff-purple-600)] hover:from-[var(--ff-purple-600)] hover:to-[var(--ff-purple-700)] text-white shadow-lg shadow-purple-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
              <Input
                type="text"
                placeholder="Search templates by name, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[var(--ff-bg-layer)] border-[var(--ff-border)] text-[var(--ff-text-primary)] focus:ring-2 focus:ring-[var(--ff-purple-500)]/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] hover:text-[var(--ff-text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const count = category.value === 'all'
                  ? templates.length
                  : category.value === 'custom'
                    ? templates.filter(t => !t.isPreBuilt).length
                    : templates.filter(t => t.category === category.value).length;

                return (
                  <Button
                    key={category.value}
                    variant={selectedCategory === category.value ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`transition-all duration-200 ${
                      selectedCategory === category.value
                        ? 'bg-[var(--ff-purple-500)] text-white shadow-lg shadow-purple-500/25'
                        : 'border-[var(--ff-border)] text-[var(--ff-text-secondary)] hover:border-[var(--ff-purple-500)]/50 hover:text-[var(--ff-text-primary)]'
                    }`}
                  >
                    <span className="mr-1.5">{category.icon}</span>
                    {category.label}
                    <Badge
                      variant="secondary"
                      className={`ml-2 text-xs ${
                        selectedCategory === category.value
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--ff-bg-dark)] text-[var(--ff-text-muted)]'
                      }`}
                    >
                      {count}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-4 text-sm text-[var(--ff-text-muted)]">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--ff-purple-500)]" />
              <span>{templates.filter(t => t.isPreBuilt).length} pre-built templates</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-[var(--ff-purple-500)]" />
              <span>{templates.filter(t => !t.isPreBuilt).length} custom templates</span>
            </div>
            {searchQuery && (
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[var(--ff-purple-500)]" />
                <span>{filteredTemplates.length} results for &quot;{searchQuery}&quot;</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Gallery */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-[var(--ff-bg-layer)] animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <CardGlass>
            <CardGlassContent className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-[var(--ff-text-muted)] mb-4" />
              <h3 className="heading-s mb-2">No templates found</h3>
              <p className="paragraph-m text-[var(--ff-text-muted)] mb-6">
                {searchQuery
                  ? `No templates match "${searchQuery}"`
                  : 'Create your first template to get started'}
              </p>
              <Button
                onClick={() => setShowBuilder(true)}
                className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardGlassContent>
          </CardGlass>
        ) : (
          <TemplateGallery
            templates={filteredTemplates}
            onEdit={(template) => {
              setEditingTemplate(template);
              setShowBuilder(true);
            }}
            onDelete={handleDeleteTemplate}
            onApply={handleApplyTemplate}
            onDuplicate={async (template) => {
              const newTemplate = {
                ...template,
                name: `${template.name} (Copy)`,
                id: undefined,
                isPreBuilt: false
              };
              await handleCreateTemplate(newTemplate);
            }}
          />
        )}
      </div>

      {/* Template Selector Modal */}
      {showSelector && (
        <TemplateSelectorModal
          templates={templates}
          onSelect={(template) => {
            handleApplyTemplate(template.id);
            setShowSelector(false);
          }}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}