'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Maximize2,
  Minimize2,
  RefreshCw,
  Calendar,
  Users,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface TemplateSection {
  title: string;
  content: string;
}

interface Template {
  name: string;
  description: string;
  category: string;
  sections: TemplateSection[];
  variables: string[];
  tags: string[];
}

interface TemplatePreviewProps {
  template: Template;
  fullscreen?: boolean;
}

// Sample data for preview
const sampleData: Record<string, string> = {
  '{{meeting_title}}': 'Q4 Planning Session',
  '{{date}}': new Date().toLocaleDateString(),
  '{{time}}': '2:00 PM PST',
  '{{duration}}': '60 minutes',
  '{{attendees}}': 'John Doe, Jane Smith, Bob Johnson',
  '{{organizer}}': 'Sarah Williams',
  '{{platform}}': 'Zoom',
  '{{meeting_link}}': 'https://zoom.us/j/123456789',
  '{{company}}': 'Acme Corporation',
  '{{prospect_name}}': 'Michael Brown',
  '{{customer}}': 'TechCorp Inc.',
  '{{employee}}': 'Emily Davis',
  '{{manager}}': 'Robert Miller',
  '{{team}}': 'Engineering Team',
  '{{sprint}}': 'Sprint 23',
  '{{quarter}}': 'Q4',
  '{{year}}': '2024',
  '{{candidate}}': 'Alice Johnson',
  '{{position}}': 'Senior Software Engineer',
  '{{interviewer}}': 'David Chen',
  '{{product}}': 'OpenMeet.ai',
  '{{features_shown}}': 'Auto-transcription, AI summaries, Search',
  '{{account_manager}}': 'Lisa Anderson',
  '{{facilitator}}': 'Tom Wilson',
  '{{velocity}}': '42 points'
};

export default function TemplatePreview({
  template,
  fullscreen = false
}: TemplatePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(fullscreen);
  const [randomSeed, setRandomSeed] = useState(0);

  // Apply variable substitution
  const processContent = (content: string): string => {
    return content.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      const key = `{{${variable}}}`;
      return sampleData[key] || match;
    });
  };

  // Convert markdown to HTML (simple version)
  const renderMarkdown = (text: string): string => {
    return text
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-2 text-[var(--ff-text-primary)]">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-2 text-[var(--ff-text-primary)]">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-3 text-[var(--ff-text-primary)]">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--ff-text-primary)]">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4 text-[var(--ff-text-secondary)]">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-[var(--ff-text-secondary)]">$1</li>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-3 text-[var(--ff-text-secondary)]">')
      .replace(/\n/g, '<br />');
  };

  const handleRefresh = () => {
    // Simulate data refresh by changing seed
    setRandomSeed(prev => prev + 1);
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--ff-bg-dark)] overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-m">Template Preview: {template.name}</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)]"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <PreviewContent template={template} processContent={processContent} renderMarkdown={renderMarkdown} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Preview
          </CardGlassTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-[var(--ff-text-muted)]"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(true)}
              className="text-[var(--ff-text-muted)]"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent className="max-h-[600px] overflow-y-auto">
        <PreviewContent template={template} processContent={processContent} renderMarkdown={renderMarkdown} />
      </CardGlassContent>
    </CardGlass>
  );
}

interface PreviewContentProps {
  template: Template;
  processContent: (content: string) => string;
  renderMarkdown: (text: string) => string;
}

function PreviewContent({ template, processContent, renderMarkdown }: PreviewContentProps) {
  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="pb-4 border-b border-[var(--ff-border)]">
        <h3 className="heading-s mb-2">{template.name}</h3>
        <p className="paragraph-s text-[var(--ff-text-muted)] mb-3">
          {template.description}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {template.category.replace(/_/g, ' ')}
          </Badge>
          {template.tags.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs bg-[var(--ff-bg-layer)] text-[var(--ff-text-muted)]"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Sample Data Indicator */}
      <div className="flex items-start gap-2 p-3 bg-[var(--ff-purple-500)]/10 rounded-lg">
        <Eye className="w-4 h-4 text-[var(--ff-purple-500)] mt-0.5" />
        <div className="text-xs text-[var(--ff-text-secondary)]">
          This preview shows how your template will look with sample data.
          Variables are automatically replaced with example values.
        </div>
      </div>

      {/* Rendered Sections */}
      <div className="space-y-6">
        {template.sections.map((section, index) => (
          <div key={index} className="bg-[var(--ff-bg-layer)] rounded-lg p-6">
            <h3 className="heading-s mb-4 pb-2 border-b border-[var(--ff-border)]">
              {section.title}
            </h3>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(processContent(section.content))
              }}
            />
          </div>
        ))}
      </div>

      {/* Variable Reference */}
      {template.variables.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--ff-border)]">
          <h4 className="text-sm font-semibold mb-3 text-[var(--ff-text-primary)]">
            Variables Used in This Template
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {template.variables.map(variable => (
              <div
                key={variable}
                className="flex items-center justify-between p-2 bg-[var(--ff-bg-layer)] rounded-lg"
              >
                <code className="text-xs text-[var(--ff-purple-500)]">
                  {variable}
                </code>
                <span className="text-xs text-[var(--ff-text-muted)]">
                  → {sampleData[variable] || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}