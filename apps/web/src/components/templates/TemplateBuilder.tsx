'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  X,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Hash,
  Eye,
  FileText,
  Settings,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import VariableToolbar from './VariableToolbar';
import TemplatePreview from './TemplatePreview';

interface TemplateSection {
  title: string;
  content: string;
}

interface Template {
  id?: string;
  name: string;
  description: string;
  category: string;
  variables: string[];
  sections: TemplateSection[];
  tags: string[];
}

interface TemplateBuilderProps {
  template?: Template | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function TemplateBuilder({
  template,
  onSave,
  onCancel
}: TemplateBuilderProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [sections, setSections] = useState<TemplateSection[]>(
    template?.sections || [{ title: 'Meeting Overview', content: '' }]
  );
  const [tags, setTags] = useState<string[]>(template?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = [
    { value: 'sales', label: 'Sales' },
    { value: 'customer_success', label: 'Customer Success' },
    { value: 'internal', label: 'Internal' },
    { value: 'interview', label: 'Interview' },
    { value: 'project', label: 'Project' },
    { value: 'custom', label: 'Custom' }
  ];

  // Available variables
  const availableVariables = [
    '{{meeting_title}}',
    '{{date}}',
    '{{time}}',
    '{{duration}}',
    '{{attendees}}',
    '{{organizer}}',
    '{{platform}}',
    '{{meeting_link}}',
    '{{company}}',
    '{{prospect_name}}',
    '{{customer}}',
    '{{employee}}',
    '{{manager}}',
    '{{team}}',
    '{{sprint}}',
    '{{quarter}}',
    '{{year}}',
    '{{candidate}}',
    '{{position}}',
    '{{interviewer}}',
    '{{product}}',
    '{{features_shown}}',
    '{{account_manager}}',
    '{{facilitator}}',
    '{{velocity}}'
  ];

  // Extract used variables from sections
  const extractVariables = (): string[] => {
    const variables = new Set<string>();
    sections.forEach(section => {
      const matches = section.content.match(/\{\{(\w+)\}\}/g);
      if (matches) {
        matches.forEach(match => variables.add(match));
      }
    });
    return Array.from(variables);
  };

  const handleAddSection = () => {
    setSections([...sections, { title: 'New Section', content: '' }]);
    setActiveSection(sections.length);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length > 1) {
      const newSections = sections.filter((_, i) => i !== index);
      setSections(newSections);
      if (activeSection >= newSections.length) {
        setActiveSection(newSections.length - 1);
      }
    }
  };

  const handleSectionChange = (index: number, field: 'title' | 'content', value: string) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < sections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setSections(newSections);
      setActiveSection(targetIndex);
    }
  };

  const handleInsertVariable = (variable: string) => {
    const section = sections[activeSection];
    const newContent = section.content + ' ' + variable;
    handleSectionChange(activeSection, 'content', newContent);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag.toLowerCase()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (sections.length === 0) {
      newErrors.sections = 'At least one section is required';
    }
    if (sections.some(s => !s.title.trim())) {
      newErrors.sectionTitles = 'All sections must have titles';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const variables = extractVariables();

    onSave({
      name,
      description,
      category,
      sections,
      variables,
      tags
    });
  };

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] text-[var(--ff-text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--ff-bg-dark)] border-b border-[var(--ff-border)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-[var(--ff-text-muted)] hover:text-[var(--ff-text-primary)]"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <h1 className="heading-m">
                {template ? 'Edit Template' : 'Create Template'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {template ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <CardGlass>
              <CardGlassHeader>
                <CardGlassTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Template Settings
                </CardGlassTitle>
              </CardGlassHeader>
              <CardGlassContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Sales Discovery Call"
                    className={`bg-[var(--ff-bg-layer)] border-[var(--ff-border)] ${
                      errors.name ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.name && (
                    <span className="text-xs text-red-500 mt-1">{errors.name}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of when to use this template"
                    rows={3}
                    className={`bg-[var(--ff-bg-layer)] border-[var(--ff-border)] ${
                      errors.description ? 'border-red-500' : ''
                    }`}
                  />
                  {errors.description && (
                    <span className="text-xs text-red-500 mt-1">{errors.description}</span>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg text-[var(--ff-text-primary)]"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add a tag"
                      className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
                      >
                        #{tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-[var(--ff-text-muted)] hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardGlassContent>
            </CardGlass>

            {/* Sections Editor */}
            <CardGlass>
              <CardGlassHeader>
                <div className="flex items-center justify-between">
                  <CardGlassTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Template Sections
                  </CardGlassTitle>
                  <Button
                    type="button"
                    onClick={handleAddSection}
                    size="sm"
                    className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Section
                  </Button>
                </div>
              </CardGlassHeader>
              <CardGlassContent className="space-y-4">
                {errors.sections && (
                  <div className="text-red-500 text-sm">{errors.sections}</div>
                )}
                {errors.sectionTitles && (
                  <div className="text-red-500 text-sm">{errors.sectionTitles}</div>
                )}

                {/* Section Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--ff-border)]">
                  {sections.map((section, index) => (
                    <Button
                      key={index}
                      variant={activeSection === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveSection(index)}
                      className={activeSection === index
                        ? 'bg-[var(--ff-purple-500)] text-white'
                        : 'border-[var(--ff-border)] text-[var(--ff-text-secondary)]'}
                    >
                      {section.title || `Section ${index + 1}`}
                    </Button>
                  ))}
                </div>

                {/* Active Section Editor */}
                {sections[activeSection] && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Input
                        value={sections[activeSection].title}
                        onChange={(e) => handleSectionChange(activeSection, 'title', e.target.value)}
                        placeholder="Section title"
                        className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] flex-1"
                      />
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(activeSection, 'up')}
                          disabled={activeSection === 0}
                          className="text-[var(--ff-text-muted)]"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveSection(activeSection, 'down')}
                          disabled={activeSection === sections.length - 1}
                          className="text-[var(--ff-text-muted)]"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        {sections.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSection(activeSection)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Content (Markdown supported)</Label>
                        <span className="text-xs text-[var(--ff-text-muted)]">
                          Use variable syntax for dynamic content
                        </span>
                      </div>
                      <Textarea
                        value={sections[activeSection].content}
                        onChange={(e) => handleSectionChange(activeSection, 'content', e.target.value)}
                        placeholder="Section content..."
                        rows={10}
                        className="bg-[var(--ff-bg-layer)] border-[var(--ff-border)] font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </CardGlassContent>
            </CardGlass>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Variable Toolbar */}
            <VariableToolbar
              availableVariables={availableVariables}
              onInsert={handleInsertVariable}
              usedVariables={extractVariables()}
            />

            {/* Preview */}
            {showPreview && (
              <TemplatePreview
                template={{
                  name,
                  description,
                  category,
                  sections,
                  variables: extractVariables(),
                  tags
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}