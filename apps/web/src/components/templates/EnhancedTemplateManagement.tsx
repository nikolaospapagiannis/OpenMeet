'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Save,
  X,
  Eye,
  Users,
  History,
  Share2,
  Settings,
  Code,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTemplates } from '@/hooks/useTemplates';

// Import our new enhanced components
import EnhancedTemplateEditor from './EnhancedTemplateEditor';
import EnhancedVariableInserter from './EnhancedVariableInserter';
import TemplatePreviewModal from './TemplatePreviewModal';
import TemplateCollaboration from './TemplateCollaboration';
import TemplateVersions from './TemplateVersions';
import TemplateSharing from './TemplateSharing';

interface TemplateSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface EnhancedTemplateManagementProps {
  templateId?: string;
  onClose: () => void;
  onSave: (template: any) => void;
  className?: string;
}

export default function EnhancedTemplateManagement({
  templateId,
  onClose,
  onSave,
  className
}: EnhancedTemplateManagementProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    template,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    getVersionHistory,
    shareTemplate,
    favoriteTemplate,
    previewTemplate
  } = useTemplates();

  const [activeTab, setActiveTab] = useState('editor');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  const [templateTags, setTemplateTags] = useState<string[]>([]);
  const [sections, setSections] = useState<TemplateSection[]>([
    { id: '1', title: 'Introduction', content: '', order: 0 }
  ]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [usedVariables, setUsedVariables] = useState<string[]>([]);
  const [customVariables, setCustomVariables] = useState<any[]>([]);
  const [isDraft, setIsDraft] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'sales', label: 'Sales' },
    { value: 'customer_success', label: 'Customer Success' },
    { value: 'internal', label: 'Internal' },
    { value: 'interview', label: 'Interview' },
    { value: 'project', label: 'Project' },
    { value: 'custom', label: 'Custom' }
  ];

  // Load existing template
  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const data = await fetchTemplate(templateId!);
      if (data) {
        setTemplateName(data.name);
        setTemplateDescription(data.description);
        setTemplateCategory(data.category);
        setTemplateTags(data.tags || []);
        setSections(data.sections.map((s: any, index: number) => ({
          id: `${index}`,
          title: s.title,
          content: s.content,
          order: index
        })));
        setIsDraft(data.metadata?.isDraft || false);
        setIsPublic(data.metadata?.isPublic || false);

        // Extract variables from sections
        const vars = extractVariables(data.sections);
        setUsedVariables(vars);

        // Load version history
        loadVersionHistory();

        // Mock collaborators for demo
        setCollaborators([
          {
            id: user?.id || 'current-user',
            name: user?.name || 'You',
            email: user?.email || '',
            avatar: user?.avatar,
            color: '#9333ea',
            role: 'owner',
            status: 'online',
            permissions: {
              canEdit: true,
              canComment: true,
              canShare: true,
              canDelete: true
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const loadVersionHistory = async () => {
    if (templateId) {
      try {
        const history = await getVersionHistory(templateId);
        setVersionHistory(history);
      } catch (error) {
        console.error('Error loading version history:', error);
      }
    }
  };

  // Extract variables from content
  const extractVariables = (sections: any[]): string[] => {
    const vars = new Set<string>();
    sections.forEach(section => {
      const content = typeof section === 'string' ? section : section.content;
      const matches = content.match(/\\{\\{([^}]+)\\}\\}/g);
      if (matches) {
        matches.forEach((match: string) => vars.add(match));
      }
    });
    return Array.from(vars);
  };

  // Handle section content change
  const handleSectionContentChange = (content: string) => {
    const updatedSections = [...sections];
    updatedSections[currentSectionIndex].content = content;
    setSections(updatedSections);
    setUnsavedChanges(true);

    // Update used variables
    const vars = extractVariables(updatedSections);
    setUsedVariables(vars);
  };

  // Add new section
  const addSection = () => {
    const newSection: TemplateSection = {
      id: Date.now().toString(),
      title: `Section ${sections.length + 1}`,
      content: '',
      order: sections.length
    };
    setSections([...sections, newSection]);
    setCurrentSectionIndex(sections.length);
    setUnsavedChanges(true);
  };

  // Remove section
  const removeSection = (index: number) => {
    if (sections.length <= 1) return;

    const updatedSections = sections.filter((_, i) => i !== index);
    setSections(updatedSections);

    if (currentSectionIndex >= updatedSections.length) {
      setCurrentSectionIndex(updatedSections.length - 1);
    }

    setUnsavedChanges(true);
  };

  // Reorder sections
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const updatedSections = [...sections];
    [updatedSections[index], updatedSections[newIndex]] = [updatedSections[newIndex], updatedSections[index]];
    setSections(updatedSections);
    setCurrentSectionIndex(newIndex);
    setUnsavedChanges(true);
  };

  // Validate template
  const validateTemplate = (): boolean => {
    const errors: string[] = [];

    if (!templateName.trim()) {
      errors.push('Template name is required');
    }

    if (!templateDescription.trim()) {
      errors.push('Template description is required');
    }

    if (sections.length === 0 || sections.every(s => !s.content.trim())) {
      errors.push('Template must have at least one section with content');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save template
  const handleSave = async () => {
    if (!validateTemplate()) return;

    setSaving(true);
    try {
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

      setUnsavedChanges(false);
      onSave(savedTemplate);

      // Show success message
      setTimeout(() => {
        if (!templateId) {
          router.push(`/templates/${savedTemplate.id}/edit`);
        }
      }, 500);
    } catch (error) {
      console.error('Error saving template:', error);
      setValidationErrors(['Failed to save template. Please try again.']);
    } finally {
      setSaving(false);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !unsavedChanges || saving) return;

    const timer = setTimeout(() => {
      if (templateId && validateTemplate()) {
        handleSave();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(timer);
  }, [autoSave, unsavedChanges, saving]);

  // Handle variable insertion
  const handleVariableInsert = (variable: string) => {
    // Variable is inserted directly in the editor
    if (!usedVariables.includes(variable)) {
      setUsedVariables([...usedVariables, variable]);
    }
  };

  // Handle custom variable creation
  const handleCreateCustomVariable = (variable: any) => {
    setCustomVariables([...customVariables, variable]);
  };

  // Handle template preview
  const handlePreview = () => {
    setShowPreview(true);
  };

  // Handle template export
  const handleExport = (format: 'html' | 'pdf' | 'markdown' | 'text') => {
    // Implementation for export
    console.log('Exporting template as', format);
  };

  // Current collaborator (mock)
  const currentCollaborator = {
    id: user?.id || 'current-user',
    name: user?.name || 'You',
    email: user?.email || '',
    avatar: user?.avatar,
    color: '#9333ea',
    role: 'owner' as const,
    status: 'online' as const,
    permissions: {
      canEdit: true,
      canComment: true,
      canShare: true,
      canDelete: true
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 bg-[var(--ff-bg-dark)]", className)}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ff-border)]">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {templateId ? 'Edit Template' : 'Create Template'}
              </h1>
              <p className="text-sm text-[var(--ff-text-muted)]">
                Design your template with rich text editing and dynamic variables
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Indicators */}
            <div className="flex items-center gap-2 mr-4">
              {unsavedChanges && (
                <Badge variant="outline" className="text-orange-500">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Unsaved Changes
                </Badge>
              )}
              {isDraft && (
                <Badge variant="secondary">
                  Draft
                </Badge>
              )}
              {isPublic && (
                <Badge variant="default" className="bg-green-500">
                  Public
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              onClick={handlePreview}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCollaboration(!showCollaboration)}
            >
              <Users className="w-4 h-4 mr-2" />
              Collaborate
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || validationErrors.length > 0}
              className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-800 dark:text-red-200">
                Please fix the following errors:
              </span>
            </div>
            <ul className="mt-2 ml-6 text-sm text-red-700 dark:text-red-300 list-disc">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Template Settings */}
          <div className="w-80 border-r border-[var(--ff-border)] flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="editor" className="flex-1">
                  <FileText className="w-4 h-4 mr-1" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="variables" className="flex-1">
                  <Code className="w-4 h-4 mr-1" />
                  Variables
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex-1">
                  <Settings className="w-4 h-4 mr-1" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {/* Editor Tab */}
                <TabsContent value="editor" className="m-0 p-4 space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      placeholder="Enter template name"
                      value={templateName}
                      onChange={(e) => {
                        setTemplateName(e.target.value);
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-description">Description</Label>
                    <Textarea
                      id="template-description"
                      placeholder="Describe what this template is for"
                      value={templateDescription}
                      onChange={(e) => {
                        setTemplateDescription(e.target.value);
                        setUnsavedChanges(true);
                      }}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <Select
                      value={templateCategory}
                      onValueChange={(value) => {
                        setTemplateCategory(value);
                        setUnsavedChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="template-tags">Tags</Label>
                    <Input
                      id="template-tags"
                      placeholder="Enter tags separated by commas"
                      value={templateTags.join(', ')}
                      onChange={(e) => {
                        setTemplateTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean));
                        setUnsavedChanges(true);
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Sections */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Sections</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addSection}
                      >
                        Add Section
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {sections.map((section, index) => (
                        <div
                          key={section.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                            index === currentSectionIndex
                              ? "bg-[var(--ff-purple-500)]/10 border border-[var(--ff-purple-500)]"
                              : "bg-[var(--ff-bg-layer)] hover:bg-[var(--ff-bg-hover)]"
                          )}
                          onClick={() => setCurrentSectionIndex(index)}
                        >
                          <div className="flex-1">
                            <Input
                              value={section.title}
                              onChange={(e) => {
                                const updatedSections = [...sections];
                                updatedSections[index].title = e.target.value;
                                setSections(updatedSections);
                                setUnsavedChanges(true);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSection(index, 'up');
                              }}
                              disabled={index === 0}
                              className="p-1 h-6 w-6"
                            >
                              <ChevronLeft className="w-3 h-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSection(index, 'down');
                              }}
                              disabled={index === sections.length - 1}
                              className="p-1 h-6 w-6"
                            >
                              <ChevronRight className="w-3 h-3 rotate-90" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSection(index);
                              }}
                              disabled={sections.length <= 1}
                              className="p-1 h-6 w-6"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Variables Tab */}
                <TabsContent value="variables" className="m-0 h-full">
                  <EnhancedVariableInserter
                    onInsert={handleVariableInsert}
                    usedVariables={usedVariables}
                    customVariables={customVariables}
                    onCreateCustom={handleCreateCustomVariable}
                    position="inline"
                  />
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="m-0 p-4 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-save" className="cursor-pointer">
                        Auto-save
                      </Label>
                      <Switch
                        id="auto-save"
                        checked={autoSave}
                        onCheckedChange={setAutoSave}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-draft" className="cursor-pointer">
                        Save as Draft
                      </Label>
                      <Switch
                        id="is-draft"
                        checked={isDraft}
                        onCheckedChange={(checked) => {
                          setIsDraft(checked);
                          setUnsavedChanges(true);
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-public" className="cursor-pointer">
                        Make Public
                      </Label>
                      <Switch
                        id="is-public"
                        checked={isPublic}
                        onCheckedChange={(checked) => {
                          setIsPublic(checked);
                          setUnsavedChanges(true);
                        }}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Version History */}
                  {templateId && (
                    <div className="space-y-2">
                      <Label>Version History</Label>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Show version history
                        }}
                      >
                        <History className="w-4 h-4 mr-2" />
                        View History
                      </Button>
                    </div>
                  )}

                  {/* Sharing */}
                  {templateId && (
                    <div className="space-y-2">
                      <Label>Sharing</Label>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          // Show sharing options
                        }}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Template
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Center Panel - Rich Text Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            {sections.length > 0 && (
              <EnhancedTemplateEditor
                content={sections[currentSectionIndex].content}
                onChange={handleSectionContentChange}
                placeholder="Start typing your template content..."
                height="600px"
                onVariableInsert={handleVariableInsert}
                showVariables={false}
                usedVariables={usedVariables}
                showWordCount={true}
                autoSave={autoSave}
                autoSaveInterval={30000}
                onAutoSave={() => {
                  if (templateId) {
                    handleSave();
                  }
                }}
                showToolbar={true}
                enableCollaboration={showCollaboration}
                collaborators={showCollaboration ? collaborators : []}
              />
            )}
          </div>

          {/* Right Panel - Collaboration */}
          {showCollaboration && (
            <div className="w-80 border-l border-[var(--ff-border)]">
              <TemplateCollaboration
                templateId={templateId || 'new'}
                currentUser={currentCollaborator}
                collaborators={collaborators}
                onInvite={(email, role) => {
                  // Handle invite
                  console.log('Inviting', email, 'as', role);
                }}
                onSendMessage={(message) => {
                  // Handle message
                  console.log('Message:', message);
                }}
                connectionStatus="connected"
                showPresence={true}
                showComments={true}
                showActivity={true}
              />
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <TemplatePreviewModal
            template={{
              id: templateId || 'preview',
              name: templateName,
              description: templateDescription,
              sections: sections.map(s => ({
                title: s.title,
                content: s.content
              })),
              variables: usedVariables,
              tags: templateTags
            }}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            onApply={(content) => {
              console.log('Applied template:', content);
              setShowPreview(false);
            }}
            onExport={handleExport}
            showVariableEditor={true}
            enableSharing={true}
            enablePrinting={true}
          />
        )}
      </div>
    </div>
  );
}