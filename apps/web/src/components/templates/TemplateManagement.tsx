'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Settings,
  Share2,
  Clock,
  Hash,
  Eye,
  Save,
  X,
  ChevronRight,
  Copy,
  Download,
  Upload,
  Trash2,
  Star,
  StarOff,
  Lock,
  Unlock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CardGlass,
  CardGlassContent,
  CardGlassHeader,
  CardGlassTitle,
  CardGlassDescription
} from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import TemplateEditor from './TemplateEditor';
import VariableInserter from './VariableInserter';
import TemplateVersions from './TemplateVersions';
import TemplateSharing from './TemplateSharing';
import TemplatePreview from './TemplatePreview';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/contexts/AuthContext';

interface Section {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface TemplateManagementProps {
  templateId?: string;
  onClose?: () => void;
  onSave?: (template: any) => void;
}

export default function TemplateManagement({
  templateId,
  onClose,
  onSave
}: TemplateManagementProps) {
  const { user } = useAuth();
  const {
    fetchTemplate,
    createTemplate,
    updateTemplate,
    favoriteTemplate,
    unfavoriteTemplate,
    previewTemplate,
    exportTemplate,
    importTemplate,
    getVersionHistory,
    restoreVersion
  } = useTemplates();

  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([
    { id: '1', title: '', content: '', order: 0 }
  ]);
  const [activeTab, setActiveTab] = useState('editor');
  const [showPreview, setShowPreview] = useState(true);
  const [editingSectionId, setEditingSectionId] = useState<string>('1');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [isDraft, setIsDraft] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [usedVariables, setUsedVariables] = useState<string[]>([]);
  const [customVariables, setCustomVariables] = useState<any[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Load existing template if editing
  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const data = await fetchTemplate(templateId);
      setTemplate(data);
      setTemplateName(data.name);
      setTemplateDescription(data.description);
      setTemplateCategory(data.category);
      setTemplateTags(data.tags || []);
      setSections(data.sections.map((s: any, i: number) => ({
        id: String(i + 1),
        title: s.title,
        content: s.content,
        order: i
      })));
      setIsDraft(data.metadata?.isDraft || false);
      setIsPublic(data.metadata?.isPublic || false);
      setIsFavorite(data.metadata?.favorited || false);
      extractVariables(data.sections);
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract variables from content
  const extractVariables = (sections: any[]) => {
    const variables = new Set<string>();
    sections.forEach(section => {
      const matches = section.content.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => variables.add(match));
      }
    });
    setUsedVariables(Array.from(variables));
  };

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !templateId) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 5000); // Auto-save every 5 seconds of inactivity

    return () => clearTimeout(timer);
  }, [sections, templateName, templateDescription, autoSaveEnabled]);

  // Handle section changes
  const handleSectionChange = (sectionId: string, field: 'title' | 'content', value: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, [field]: value } : s
    ));

    // Extract variables if content changed
    if (field === 'content') {
      extractVariables(sections);
    }
  };

  // Add new section
  const addSection = () => {
    const newSection: Section = {
      id: String(Date.now()),
      title: '',
      content: '',
      order: sections.length
    };
    setSections([...sections, newSection]);
    setEditingSectionId(newSection.id);
  };

  // Remove section
  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) return; // Keep at least one section
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  // Reorder sections
  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

    // Update order
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
  };

  // Handle variable insertion
  const handleVariableInsert = (variable: string) => {
    if (!editingSectionId) return;

    const section = sections.find(s => s.id === editingSectionId);
    if (!section) return;

    // Insert variable at cursor position in the editor
    const updatedContent = section.content + ' ' + variable;
    handleSectionChange(editingSectionId, 'content', updatedContent);
  };

  // Handle save
  const handleSave = async (isAutoSave = false) => {
    try {
      setLoading(true);

      const templateData = {
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        tags: templateTags,
        sections: sections.map(s => ({
          title: s.title,
          content: s.content
        })),
        variables: usedVariables,
        isDraft,
        isPublic
      };

      let savedTemplate;
      if (templateId) {
        savedTemplate = await updateTemplate(templateId, templateData);
      } else {
        savedTemplate = await createTemplate(templateData);
      }

      setTemplate(savedTemplate);
      setLastSaved(new Date());

      if (!isAutoSave) {
        onSave?.(savedTemplate);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!templateId) return;

    try {
      if (isFavorite) {
        await unfavoriteTemplate(templateId);
      } else {
        await favoriteTemplate(templateId);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Export template
  const handleExport = async (format: 'json' | 'markdown' = 'json') => {
    if (!templateId) return;

    try {
      const blob = await exportTemplate(templateId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateName}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting template:', error);
    }
  };

  // Import template
  const handleImport = async () => {
    if (!importFile) return;

    try {
      setLoading(true);
      const imported = await importTemplate(importFile);
      setTemplate(imported);
      setTemplateName(imported.name + ' (Imported)');
      setTemplateDescription(imported.description);
      setTemplateCategory(imported.category);
      setTemplateTags(imported.tags || []);
      setSections(imported.sections.map((s: any, i: number) => ({
        id: String(i + 1),
        title: s.title,
        content: s.content,
        order: i
      })));
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error) {
      console.error('Error importing template:', error);
    } finally {
      setLoading(false);
    }
  };

  // Restore version
  const handleRestoreVersion = async (version: any) => {
    if (!templateId) return;

    try {
      setLoading(true);
      const restored = await restoreVersion(templateId, version.id);
      setTemplate(restored);
      setSections(restored.sections.map((s: any, i: number) => ({
        id: String(i + 1),
        title: s.title,
        content: s.content,
        order: i
      })));
      extractVariables(restored.sections);
    } catch (error) {
      console.error('Error restoring version:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create custom variable
  const handleCreateCustomVariable = (variable: any) => {
    setCustomVariables([...customVariables, variable]);
  };

  // Build template object for preview
  const buildTemplateForPreview = () => ({
    name: templateName || 'Untitled Template',
    description: templateDescription || 'No description provided',
    category: templateCategory,
    sections: sections.filter(s => s.title || s.content),
    variables: usedVariables,
    tags: templateTags
  });

  return (
    <div className="min-h-screen bg-[var(--ff-bg-dark)] text-[var(--ff-text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--ff-bg-dark)] border-b border-[var(--ff-border)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-[var(--ff-text-muted)]"
              >
                <X className="w-4 h-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template Name"
                    className="text-lg font-semibold bg-transparent border-none focus:ring-0 p-0"
                  />
                  {templateId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleFavorite}
                      className="text-[var(--ff-text-muted)]"
                    >
                      {isFavorite ? (
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                <Input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="text-sm text-[var(--ff-text-muted)] bg-transparent border-none focus:ring-0 p-0 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                {isDraft && (
                  <Badge variant="outline" className="text-xs">
                    Draft
                  </Badge>
                )}
                {isPublic ? (
                  <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                    <Unlock className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </Badge>
                )}
                {lastSaved && (
                  <span className="text-xs text-[var(--ff-text-muted)]">
                    Saved {new Date(lastSaved).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportDialog(true)}
                  className="border-[var(--ff-border)]"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  disabled={!templateId}
                  className="border-[var(--ff-border)]"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={loading || !templateName}
                  className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {templateId ? 'Save Changes' : 'Create Template'}
                </Button>
              </div>
            </div>
          </div>

          {/* Template settings bar */}
          <div className="flex items-center gap-4 mt-4">
            <Select value={templateCategory} onValueChange={setTemplateCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="customer_success">Customer Success</SelectItem>
                <SelectItem value="internal">Internal Meeting</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--ff-text-muted)]">Tags:</span>
              <Input
                type="text"
                placeholder="Add tags (comma separated)"
                value={templateTags.join(', ')}
                onChange={(e) => setTemplateTags(e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                className="w-64 bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
              />
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={isDraft} onCheckedChange={setIsDraft} />
                <span className="text-[var(--ff-text-muted)]">Save as draft</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                <span className="text-[var(--ff-text-muted)]">Make public</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} />
                <span className="text-[var(--ff-text-muted)]">Auto-save</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={showPreview} onCheckedChange={setShowPreview} />
                <span className="text-[var(--ff-text-muted)]">Show preview</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar - Variable inserter */}
          <div className="col-span-3">
            <VariableInserter
              onInsert={handleVariableInsert}
              usedVariables={usedVariables}
              customVariables={customVariables}
              onCreateCustom={handleCreateCustomVariable}
              position="inline"
            />
          </div>

          {/* Main editor area */}
          <div className={showPreview ? 'col-span-5' : 'col-span-9'}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="editor">
                  <FileText className="w-4 h-4 mr-2" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="versions" disabled={!templateId}>
                  <Clock className="w-4 h-4 mr-2" />
                  Versions
                </TabsTrigger>
                <TabsTrigger value="sharing" disabled={!templateId}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Sharing
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor" className="mt-4 space-y-4">
                {sections.map((section, index) => (
                  <CardGlass key={section.id}>
                    <CardGlassHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-sm text-[var(--ff-text-muted)]">
                            Section {index + 1}
                          </span>
                          <Input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                            placeholder="Section Title"
                            className="flex-1 bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSection(section.id, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSection(section.id, 'down')}
                            disabled={index === sections.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(section.id)}
                            disabled={sections.length === 1}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardGlassHeader>
                    <CardGlassContent
                      className="p-0"
                      onClick={() => setEditingSectionId(section.id)}
                    >
                      <TemplateEditor
                        content={section.content}
                        onChange={(content) => handleSectionChange(section.id, 'content', content)}
                        placeholder="Start typing your template content..."
                        height="300px"
                        onVariableInsert={handleVariableInsert}
                      />
                    </CardGlassContent>
                  </CardGlass>
                ))}

                <Button
                  onClick={addSection}
                  variant="outline"
                  className="w-full border-dashed border-[var(--ff-border)] text-[var(--ff-text-muted)]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Section
                </Button>
              </TabsContent>

              <TabsContent value="versions" className="mt-4">
                {templateId && (
                  <TemplateVersions
                    templateId={templateId}
                    currentVersion={template}
                    onRestore={handleRestoreVersion}
                  />
                )}
              </TabsContent>

              <TabsContent value="sharing" className="mt-4">
                {templateId && (
                  <TemplateSharing
                    templateId={templateId}
                    templateName={templateName}
                    ownerId={user?.id || ''}
                    currentUserId={user?.id || ''}
                  />
                )}
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <CardGlass>
                  <CardGlassHeader>
                    <CardGlassTitle>Template Settings</CardGlassTitle>
                  </CardGlassHeader>
                  <CardGlassContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Advanced Options</h4>

                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Allow Duplication</p>
                            <p className="text-xs text-[var(--ff-text-muted)]">
                              Others can create their own copy of this template
                            </p>
                          </div>
                          <Switch checked={true} />
                        </label>

                        <label className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Track Usage</p>
                            <p className="text-xs text-[var(--ff-text-muted)]">
                              Collect analytics on template usage
                            </p>
                          </div>
                          <Switch checked={true} />
                        </label>

                        <label className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Version Control</p>
                            <p className="text-xs text-[var(--ff-text-muted)]">
                              Automatically save version history
                            </p>
                          </div>
                          <Switch checked={true} />
                        </label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Danger Zone</h4>
                      <Button
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        disabled={!templateId}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Template
                      </Button>
                    </div>
                  </CardGlassContent>
                </CardGlass>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar - Preview */}
          {showPreview && (
            <div className="col-span-4">
              <TemplatePreview template={buildTemplateForPreview()} />
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Template</DialogTitle>
              <DialogDescription>
                Upload a template file (JSON or Markdown format)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--ff-border)] rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".json,.md,.markdown"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="template-import"
                />
                <label
                  htmlFor="template-import"
                  className="cursor-pointer"
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-[var(--ff-text-muted)]" />
                  <p className="text-sm text-[var(--ff-text-secondary)]">
                    Click to browse or drag and drop your file here
                  </p>
                  {importFile && (
                    <p className="text-xs text-[var(--ff-purple-500)] mt-2">
                      Selected: {importFile.name}
                    </p>
                  )}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile}
                className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
              >
                Import Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}