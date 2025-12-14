'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  X,
  Download,
  Copy,
  Check,
  Edit,
  Mail,
  Printer,
  Share2,
  FileText,
  Code,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Settings,
  Palette,
  Type,
  Maximize2,
  Minimize2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TemplateSection {
  title: string;
  content: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  variables: string[];
  tags: string[];
}

interface VariableValue {
  name: string;
  value: string;
  type?: string;
  required?: boolean;
}

interface PreviewOptions {
  showVariableHighlight: boolean;
  showSectionBorders: boolean;
  showLineNumbers: boolean;
  wrapText: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
}

interface TemplatePreviewModalProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  variableValues?: Record<string, string>;
  onVariableChange?: (values: Record<string, string>) => void;
  onApply?: (finalContent: string) => void;
  onExport?: (format: 'html' | 'pdf' | 'markdown' | 'text') => void;
  readOnly?: boolean;
  showVariableEditor?: boolean;
  enableSharing?: boolean;
  enablePrinting?: boolean;
  customStyles?: React.CSSProperties;
}

export default function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  variableValues = {},
  onVariableChange,
  onApply,
  onExport,
  readOnly = false,
  showVariableEditor = true,
  enableSharing = true,
  enablePrinting = true,
  customStyles = {}
}: TemplatePreviewModalProps) {
  const [values, setValues] = useState<Record<string, string>>(variableValues);
  const [previewMode, setPreviewMode] = useState<'preview' | 'source' | 'split'>('preview');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [options, setOptions] = useState<PreviewOptions>({
    showVariableHighlight: true,
    showSectionBorders: false,
    showLineNumbers: false,
    wrapText: true,
    theme: 'auto',
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: 'system-ui'
  });
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [editingVariable, setEditingVariable] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Extract all variables from template
  const extractedVariables = useMemo(() => {
    const vars = new Set<string>();
    template.sections.forEach(section => {
      const matches = section.content.match(/\\{\\{([^}]+)\\}\\}/g);
      if (matches) {
        matches.forEach(match => vars.add(match));
      }
    });
    return Array.from(vars);
  }, [template]);

  // Initialize variable values with defaults
  useEffect(() => {
    const defaultValues: Record<string, string> = {};
    extractedVariables.forEach(variable => {
      const varName = variable.replace(/\\{\\{|\\}\\}/g, '').trim();
      if (!values[variable]) {
        // Generate default values based on variable name
        if (varName.includes('date')) {
          defaultValues[variable] = new Date().toLocaleDateString();
        } else if (varName.includes('time')) {
          defaultValues[variable] = new Date().toLocaleTimeString();
        } else if (varName.includes('name')) {
          defaultValues[variable] = 'John Doe';
        } else if (varName.includes('email')) {
          defaultValues[variable] = 'example@email.com';
        } else if (varName.includes('title')) {
          defaultValues[variable] = 'Sample Title';
        } else if (varName.includes('company')) {
          defaultValues[variable] = 'Acme Corporation';
        } else if (varName.includes('count') || varName.includes('number')) {
          defaultValues[variable] = '0';
        } else {
          defaultValues[variable] = `[${varName}]`;
        }
      }
    });

    if (Object.keys(defaultValues).length > 0) {
      setValues(prev => ({ ...defaultValues, ...prev }));
    }
  }, [extractedVariables]);

  // Check for missing required variables
  useEffect(() => {
    const missing = extractedVariables.filter(v => {
      const value = values[v];
      return !value || value.trim() === '' || value === `[${v.replace(/\\{\\{|\\}\\}/g, '').trim()}]`;
    });
    setMissingVariables(missing);
  }, [values, extractedVariables]);

  // Process content with variable substitution
  const processedContent = useMemo(() => {
    let content = template.sections.map(section => {
      let sectionContent = section.content;

      // Replace variables with values
      extractedVariables.forEach(variable => {
        const value = values[variable] || `[${variable.replace(/\\{\\{|\\}\\}/g, '').trim()}]`;
        const regex = new RegExp(variable.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'g');

        if (options.showVariableHighlight && (!values[variable] || values[variable] === `[${variable.replace(/\\{\\{|\\}\\}/g, '').trim()}]`)) {
          // Highlight missing or default variables
          sectionContent = sectionContent.replace(
            regex,
            `<span class="variable-missing">${value}</span>`
          );
        } else if (options.showVariableHighlight) {
          // Highlight filled variables
          sectionContent = sectionContent.replace(
            regex,
            `<span class="variable-filled">${value}</span>`
          );
        } else {
          // Simple replacement
          sectionContent = sectionContent.replace(regex, value);
        }
      });

      return {
        ...section,
        content: sectionContent
      };
    });

    return content;
  }, [template, values, extractedVariables, options.showVariableHighlight]);

  // Generate HTML preview
  const htmlContent = useMemo(() => {
    let html = '';
    processedContent.forEach((section, index) => {
      const sectionClass = options.showSectionBorders ? 'template-section bordered' : 'template-section';
      html += `
        <div class="${sectionClass}">
          ${section.title ? `<h2 class="section-title">${section.title}</h2>` : ''}
          <div class="section-content">${section.content.replace(/\\n/g, '<br>')}</div>
        </div>
      `;
    });
    return html;
  }, [processedContent, options.showSectionBorders]);

  // Generate source code view
  const sourceCode = useMemo(() => {
    return template.sections.map(section => {
      const lines = section.content.split('\\n');
      return {
        title: section.title,
        lines: lines.map((line, index) => ({
          number: index + 1,
          content: line,
          hasVariable: /\\{\\{[^}]+\\}\\}/.test(line)
        }))
      };
    });
  }, [template]);

  // Handle variable value change
  const handleVariableChange = (variable: string, value: string) => {
    const newValues = { ...values, [variable]: value };
    setValues(newValues);
    onVariableChange?.(newValues);
  };

  // Copy content to clipboard
  const copyToClipboard = () => {
    const plainText = processedContent.map(section =>
      `${section.title ? section.title + '\\n\\n' : ''}${section.content.replace(/<[^>]*>/g, '')}`
    ).join('\\n\\n');

    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export content
  const handleExport = (format: 'html' | 'pdf' | 'markdown' | 'text') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export implementation
      let content = '';
      let filename = `${template.name.toLowerCase().replace(/\\s+/g, '-')}.${format}`;
      let mimeType = 'text/plain';

      switch(format) {
        case 'html':
          content = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>${template.name}</title>
              <style>
                body { font-family: system-ui; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
                .section-title { font-size: 1.5em; font-weight: bold; margin-top: 20px; }
                .variable-filled { background-color: #e0f2fe; padding: 2px 4px; border-radius: 3px; }
                .variable-missing { background-color: #fee2e2; padding: 2px 4px; border-radius: 3px; }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
            </html>
          `;
          mimeType = 'text/html';
          break;

        case 'markdown':
          content = processedContent.map(section =>
            `${section.title ? '## ' + section.title + '\\n\\n' : ''}${section.content.replace(/<[^>]*>/g, '')}`
          ).join('\\n\\n');
          mimeType = 'text/markdown';
          break;

        case 'text':
          content = processedContent.map(section =>
            `${section.title ? section.title + '\\n' + '='.repeat(section.title.length) + '\\n\\n' : ''}${section.content.replace(/<[^>]*>/g, '')}`
          ).join('\\n\\n');
          break;

        case 'pdf':
          // For PDF, we would typically use a library like jsPDF
          // For now, we'll just open print dialog
          window.print();
          return;
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Print template
  const handlePrint = () => {
    window.print();
  };

  // Share template
  const handleShare = async () => {
    const shareData = {
      title: template.name,
      text: template.description,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy link to clipboard
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  // Apply template
  const handleApply = () => {
    const finalContent = processedContent.map(section =>
      `${section.title ? section.title + '\\n\\n' : ''}${section.content.replace(/<[^>]*>/g, '')}`
    ).join('\\n\\n');

    onApply?.(finalContent);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-6xl h-[90vh] p-0 flex flex-col",
        isFullscreen && "fixed inset-4 max-w-none h-auto"
      )}>
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-[var(--ff-border)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {template.name}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {template.description}
              </DialogDescription>
              {template.tags && template.tags.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Tabs */}
              <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="preview">
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="source">
                    <Code className="w-4 h-4 mr-1" />
                    Source
                  </TabsTrigger>
                  <TabsTrigger value="split">
                    <Maximize2 className="w-4 h-4 mr-1" />
                    Split
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 px-2 border-l border-[var(--ff-border)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-1 h-7 w-7"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm w-12 text-center">{zoom}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="p-1 h-7 w-7"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(100)}
                  className="p-1 h-7 w-7"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 px-2 border-l border-[var(--ff-border)]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-1 h-7 w-7"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Display Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="p-1 h-7 w-7"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy to Clipboard</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {enablePrinting && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handlePrint}
                          className="p-1 h-7 w-7"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Print</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {enableSharing && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleShare}
                          className="p-1 h-7 w-7"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-1 h-7 w-7"
                      >
                        {isFullscreen ? (
                          <Minimize2 className="w-4 h-4" />
                        ) : (
                          <Maximize2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 h-7 w-7"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-6 py-4 border-b border-[var(--ff-border)] bg-[var(--ff-bg-layer)] flex-shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Label className="text-sm">Font Size</Label>
                <Slider
                  value={[options.fontSize]}
                  onValueChange={([value]) => setOptions({ ...options, fontSize: value })}
                  min={10}
                  max={20}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm w-8">{options.fontSize}</span>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm">Line Height</Label>
                <Slider
                  value={[options.lineHeight * 10]}
                  onValueChange={([value]) => setOptions({ ...options, lineHeight: value / 10 })}
                  min={10}
                  max={25}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm w-8">{options.lineHeight}</span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Switch
                  checked={options.showVariableHighlight}
                  onCheckedChange={(checked) => setOptions({ ...options, showVariableHighlight: checked })}
                />
                <Label className="text-sm cursor-pointer">Highlight Variables</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={options.showSectionBorders}
                  onCheckedChange={(checked) => setOptions({ ...options, showSectionBorders: checked })}
                />
                <Label className="text-sm cursor-pointer">Section Borders</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={options.wrapText}
                  onCheckedChange={(checked) => setOptions({ ...options, wrapText: checked })}
                />
                <Label className="text-sm cursor-pointer">Wrap Text</Label>
              </div>
            </div>
          </div>
        )}

        {/* Missing Variables Warning */}
        {missingVariables.length > 0 && showVariableEditor && (
          <div className="px-6 py-3 bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-800 dark:text-orange-200">
                {missingVariables.length} variable{missingVariables.length > 1 ? 's' : ''} need{missingVariables.length === 1 ? 's' : ''} values:
              </span>
              <div className="flex gap-2 ml-2">
                {missingVariables.slice(0, 3).map(v => (
                  <code key={v} className="text-xs bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                    {v}
                  </code>
                ))}
                {missingVariables.length > 3 && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    +{missingVariables.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Variable Editor Panel */}
          {showVariableEditor && !readOnly && (
            <div className="w-80 border-r border-[var(--ff-border)] flex flex-col">
              <div className="px-4 py-3 border-b border-[var(--ff-border)]">
                <h3 className="font-medium text-sm">Variable Values</h3>
                <p className="text-xs text-[var(--ff-text-muted)] mt-1">
                  Fill in values for template variables
                </p>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {extractedVariables.map(variable => {
                    const varName = variable.replace(/\\{\\{|\\}\\}/g, '').trim();
                    const value = values[variable] || '';
                    const isMissing = missingVariables.includes(variable);

                    return (
                      <div key={variable} className={cn(
                        "space-y-1",
                        isMissing && "p-2 bg-orange-50 dark:bg-orange-950 rounded-lg"
                      )}>
                        <Label htmlFor={variable} className="text-sm flex items-center gap-2">
                          <code className="font-mono text-xs text-[var(--ff-purple-500)]">
                            {varName}
                          </code>
                          {isMissing && (
                            <Badge variant="outline" className="text-xs px-1 py-0 text-orange-500">
                              Required
                            </Badge>
                          )}
                        </Label>
                        {editingVariable === variable ? (
                          <div className="flex gap-1">
                            <Input
                              id={variable}
                              value={value}
                              onChange={(e) => handleVariableChange(variable, e.target.value)}
                              onBlur={() => setEditingVariable(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingVariable(null);
                                }
                              }}
                              autoFocus
                              className="text-sm"
                            />
                          </div>
                        ) : (
                          <div
                            className="px-3 py-1.5 bg-[var(--ff-bg-layer)] rounded-lg text-sm cursor-pointer hover:bg-[var(--ff-bg-hover)] transition-colors"
                            onClick={() => setEditingVariable(variable)}
                          >
                            {value || <span className="text-[var(--ff-text-muted)]">Click to edit</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Preview Area */}
          <div className="flex-1 flex">
            {previewMode === 'split' ? (
              // Split View
              <>
                <div className="flex-1 border-r border-[var(--ff-border)]">
                  <div className="h-full overflow-auto p-6">
                    <div
                      className="prose prose-invert max-w-none template-preview"
                      style={{
                        fontSize: `${options.fontSize}px`,
                        lineHeight: options.lineHeight,
                        fontFamily: options.fontFamily,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left',
                        whiteSpace: options.wrapText ? 'normal' : 'nowrap',
                        ...customStyles
                      }}
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-full overflow-auto p-6 bg-[#1e1e1e]">
                    <pre className="text-sm font-mono text-gray-300">
                      {sourceCode.map((section, sIndex) => (
                        <div key={sIndex} className="mb-6">
                          {section.title && (
                            <div className="text-blue-400 mb-2">## {section.title}</div>
                          )}
                          {section.lines.map((line, lIndex) => (
                            <div key={lIndex} className="flex">
                              {options.showLineNumbers && (
                                <span className="text-gray-600 mr-4 select-none w-8 text-right">
                                  {lIndex + 1}
                                </span>
                              )}
                              <span className={line.hasVariable ? 'text-yellow-400' : ''}>
                                {line.content}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </pre>
                  </div>
                </div>
              </>
            ) : previewMode === 'source' ? (
              // Source View
              <div className="flex-1 overflow-auto p-6 bg-[#1e1e1e]">
                <pre className="text-sm font-mono text-gray-300">
                  {sourceCode.map((section, sIndex) => (
                    <div key={sIndex} className="mb-6">
                      {section.title && (
                        <div className="text-blue-400 mb-2">## {section.title}</div>
                      )}
                      {section.lines.map((line, lIndex) => (
                        <div key={lIndex} className="flex">
                          {options.showLineNumbers && (
                            <span className="text-gray-600 mr-4 select-none w-8 text-right">
                              {lIndex + 1}
                            </span>
                          )}
                          <span className={line.hasVariable ? 'text-yellow-400' : ''}>
                            {line.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </pre>
              </div>
            ) : (
              // Preview View
              <div className="flex-1 overflow-auto p-6">
                <div
                  className="prose prose-invert max-w-none template-preview"
                  style={{
                    fontSize: `${options.fontSize}px`,
                    lineHeight: options.lineHeight,
                    fontFamily: options.fontFamily,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    whiteSpace: options.wrapText ? 'normal' : 'nowrap',
                    ...customStyles
                  }}
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-[var(--ff-border)] flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {/* Export Options */}
              <Select onValueChange={handleExport}>
                <SelectTrigger className="w-32">
                  <Download className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">Export as HTML</SelectItem>
                  <SelectItem value="markdown">Export as Markdown</SelectItem>
                  <SelectItem value="text">Export as Text</SelectItem>
                  <SelectItem value="pdf">Export as PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {onApply && (
                <Button
                  onClick={handleApply}
                  disabled={missingVariables.length > 0}
                  className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                >
                  Apply Template
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>

        {/* Styles */}
        <style jsx global>{`
          .template-preview {
            color: var(--ff-text-primary);
          }

          .template-section {
            margin-bottom: 2rem;
          }

          .template-section.bordered {
            border: 1px solid var(--ff-border);
            padding: 1rem;
            border-radius: 8px;
          }

          .section-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 1rem;
            color: var(--ff-text-primary);
          }

          .section-content {
            color: var(--ff-text-secondary);
          }

          .variable-filled {
            background-color: rgba(147, 51, 234, 0.1);
            color: #9333ea;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
          }

          .variable-missing {
            background-color: rgba(251, 146, 60, 0.1);
            color: #fb923c;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
            border: 1px dashed #fb923c;
          }

          @media print {
            .template-preview {
              transform: scale(1) !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}