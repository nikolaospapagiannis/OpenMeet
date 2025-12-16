'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  GitBranch,
  ChevronRight,
  ChevronDown,
  User,
  FileText,
  Check,
  X,
  RotateCcw,
  Eye,
  Download,
  Copy,
  ArrowLeft,
  ArrowRight,
  GitCommit,
  GitMerge,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  changes: {
    type: 'added' | 'modified' | 'deleted';
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
  content: {
    name: string;
    description: string;
    sections: {
      title: string;
      content: string;
    }[];
    variables: string[];
    tags: string[];
  };
  message?: string;
  isPublished: boolean;
  isCurrent: boolean;
}

interface TemplateVersionsProps {
  templateId: string;
  currentVersion?: TemplateVersion;
  onRestore?: (version: TemplateVersion) => void;
  onCompare?: (versionA: TemplateVersion, versionB: TemplateVersion) => void;
  readOnly?: boolean;
}

export default function TemplateVersions({
  templateId,
  currentVersion,
  onRestore,
  onCompare,
  readOnly = false
}: TemplateVersionsProps) {
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersionA, setCompareVersionA] = useState<TemplateVersion | null>(null);
  const [compareVersionB, setCompareVersionB] = useState<TemplateVersion | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'diff'>('timeline');
  const [filterBy, setFilterBy] = useState<'all' | 'published' | 'draft'>('all');

  // Mock data - replace with API call
  useEffect(() => {
    const mockVersions: TemplateVersion[] = [
      {
        id: 'v5',
        templateId,
        version: '1.4.0',
        createdAt: new Date('2024-12-09T10:00:00'),
        createdBy: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        changes: [
          { type: 'added', field: 'sections', newValue: 'Next Steps' },
          { type: 'modified', field: 'description', oldValue: 'Sales call template', newValue: 'Enhanced sales discovery call template' }
        ],
        content: {
          name: 'Sales Discovery Call',
          description: 'Enhanced sales discovery call template',
          sections: [
            { title: 'Meeting Overview', content: 'Overview content...' },
            { title: 'Pain Points', content: 'Pain points discussion...' },
            { title: 'Solution Fit', content: 'How our solution addresses needs...' },
            { title: 'Next Steps', content: 'Action items and follow-up...' }
          ],
          variables: ['{{meeting.title}}', '{{prospect.name}}', '{{sales.value}}'],
          tags: ['sales', 'discovery', 'enterprise']
        },
        message: 'Added Next Steps section and improved description',
        isPublished: true,
        isCurrent: true
      },
      {
        id: 'v4',
        templateId,
        version: '1.3.0',
        createdAt: new Date('2024-12-08T15:30:00'),
        createdBy: {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        changes: [
          { type: 'added', field: 'variables', newValue: '{{sales.value}}' },
          { type: 'modified', field: 'sections[2].content', oldValue: 'Basic solution overview', newValue: 'Detailed solution fit analysis' }
        ],
        content: {
          name: 'Sales Discovery Call',
          description: 'Sales call template',
          sections: [
            { title: 'Meeting Overview', content: 'Overview content...' },
            { title: 'Pain Points', content: 'Pain points discussion...' },
            { title: 'Solution Fit', content: 'Detailed solution fit analysis...' }
          ],
          variables: ['{{meeting.title}}', '{{prospect.name}}', '{{sales.value}}'],
          tags: ['sales', 'discovery']
        },
        message: 'Added deal value variable and enhanced solution fit section',
        isPublished: true,
        isCurrent: false
      },
      {
        id: 'v3',
        templateId,
        version: '1.2.1',
        createdAt: new Date('2024-12-07T09:15:00'),
        createdBy: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        changes: [
          { type: 'modified', field: 'tags', oldValue: 'sales', newValue: 'sales, discovery' }
        ],
        content: {
          name: 'Sales Discovery Call',
          description: 'Sales call template',
          sections: [
            { title: 'Meeting Overview', content: 'Overview content...' },
            { title: 'Pain Points', content: 'Pain points discussion...' },
            { title: 'Solution Fit', content: 'Basic solution overview...' }
          ],
          variables: ['{{meeting.title}}', '{{prospect.name}}'],
          tags: ['sales', 'discovery']
        },
        message: 'Added discovery tag',
        isPublished: false,
        isCurrent: false
      },
      {
        id: 'v2',
        templateId,
        version: '1.2.0',
        createdAt: new Date('2024-12-06T14:00:00'),
        createdBy: {
          id: '3',
          name: 'Bob Johnson',
          email: 'bob@example.com'
        },
        changes: [
          { type: 'added', field: 'sections', newValue: 'Solution Fit' },
          { type: 'added', field: 'variables', newValue: '{{prospect.name}}' }
        ],
        content: {
          name: 'Sales Discovery Call',
          description: 'Sales call template',
          sections: [
            { title: 'Meeting Overview', content: 'Overview content...' },
            { title: 'Pain Points', content: 'Pain points discussion...' },
            { title: 'Solution Fit', content: 'Basic solution overview...' }
          ],
          variables: ['{{meeting.title}}', '{{prospect.name}}'],
          tags: ['sales']
        },
        message: 'Added Solution Fit section and prospect variable',
        isPublished: true,
        isCurrent: false
      },
      {
        id: 'v1',
        templateId,
        version: '1.0.0',
        createdAt: new Date('2024-12-05T10:00:00'),
        createdBy: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        changes: [],
        content: {
          name: 'Sales Discovery Call',
          description: 'Basic sales call template',
          sections: [
            { title: 'Meeting Overview', content: 'Overview content...' },
            { title: 'Pain Points', content: 'Pain points discussion...' }
          ],
          variables: ['{{meeting.title}}'],
          tags: ['sales']
        },
        message: 'Initial template creation',
        isPublished: true,
        isCurrent: false
      }
    ];

    setVersions(mockVersions);
    setLoading(false);
  }, [templateId]);

  // Filter versions
  const filteredVersions = versions.filter(v => {
    if (filterBy === 'published') return v.isPublished;
    if (filterBy === 'draft') return !v.isPublished;
    return true;
  });

  // Toggle version expansion
  const toggleVersion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  // Format date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get change icon
  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="w-3 h-3 text-green-500" />;
      case 'modified': return <GitCommit className="w-3 h-3 text-blue-500" />;
      case 'deleted': return <X className="w-3 h-3 text-red-500" />;
      default: return null;
    }
  };

  // Render diff view
  const renderDiff = (versionA: TemplateVersion, versionB: TemplateVersion) => {
    const changes: any[] = [];

    // Compare basic fields
    if (versionA.content.name !== versionB.content.name) {
      changes.push({
        field: 'Name',
        old: versionA.content.name,
        new: versionB.content.name
      });
    }

    if (versionA.content.description !== versionB.content.description) {
      changes.push({
        field: 'Description',
        old: versionA.content.description,
        new: versionB.content.description
      });
    }

    // Compare sections
    const maxSections = Math.max(versionA.content.sections.length, versionB.content.sections.length);
    for (let i = 0; i < maxSections; i++) {
      const sectionA = versionA.content.sections[i];
      const sectionB = versionB.content.sections[i];

      if (!sectionA && sectionB) {
        changes.push({
          field: `Section ${i + 1}`,
          old: null,
          new: sectionB.title
        });
      } else if (sectionA && !sectionB) {
        changes.push({
          field: `Section ${i + 1}`,
          old: sectionA.title,
          new: null
        });
      } else if (sectionA && sectionB) {
        if (sectionA.title !== sectionB.title || sectionA.content !== sectionB.content) {
          changes.push({
            field: `Section ${i + 1}`,
            old: sectionA.title,
            new: sectionB.title,
            contentChanged: sectionA.content !== sectionB.content
          });
        }
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-[var(--ff-bg-layer)] rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-[var(--ff-text-muted)]">Version </span>
              <span className="font-medium">{versionA.version}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--ff-text-muted)]" />
            <div className="text-sm">
              <span className="text-[var(--ff-text-muted)]">Version </span>
              <span className="font-medium">{versionB.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {changes.length} changes
            </Badge>
          </div>
        </div>

        {changes.map((change, index) => (
          <div key={index} className="border border-[var(--ff-border)] rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {change.old === null ? (
                  <Plus className="w-4 h-4 text-green-500" />
                ) : change.new === null ? (
                  <X className="w-4 h-4 text-red-500" />
                ) : (
                  <GitCommit className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="font-medium text-sm">{change.field}</div>
                {change.old !== null && (
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-sm">
                    <span className="text-red-400">- </span>
                    {change.old}
                  </div>
                )}
                {change.new !== null && (
                  <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                    <span className="text-green-400">+ </span>
                    {change.new}
                  </div>
                )}
                {change.contentChanged && (
                  <Badge variant="outline" className="text-xs">
                    Content also changed
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <CardGlass>
        <CardGlassContent className="py-8 text-center">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--ff-bg-layer)] rounded-lg" />
            ))}
          </div>
        </CardGlassContent>
      </CardGlass>
    );
  }

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Version History
          </CardGlassTitle>
          <div className="flex items-center gap-2">
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={compareMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareVersionA(null);
                setCompareVersionB(null);
              }}
              className={compareMode
                ? 'bg-[var(--ff-purple-500)] text-white'
                : 'border-[var(--ff-border)]'}
            >
              <GitMerge className="w-4 h-4 mr-1" />
              Compare
            </Button>
          </div>
        </div>
      </CardGlassHeader>
      <CardGlassContent>
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="diff" disabled={!compareVersionA || !compareVersionB}>
              Diff View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            {filteredVersions.map((version, index) => (
              <div key={version.id} className="relative">
                {/* Timeline line */}
                {index < filteredVersions.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-[var(--ff-border)]" />
                )}

                <div className="flex gap-4">
                  {/* Timeline dot */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                    version.isCurrent
                      ? 'bg-[var(--ff-purple-500)] text-white'
                      : 'bg-[var(--ff-bg-layer)] border border-[var(--ff-border)]'
                  }`}>
                    {version.isCurrent ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <GitBranch className="w-5 h-5 text-[var(--ff-text-muted)]" />
                    )}
                  </div>

                  {/* Version content */}
                  <div className="flex-1 pb-8">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        compareMode && (compareVersionA === version || compareVersionB === version)
                          ? 'border-[var(--ff-purple-500)] bg-[var(--ff-purple-500)]/10'
                          : 'border-[var(--ff-border)] hover:bg-[var(--ff-bg-layer)]'
                      }`}
                      onClick={() => {
                        if (compareMode) {
                          if (!compareVersionA) {
                            setCompareVersionA(version);
                          } else if (!compareVersionB && version !== compareVersionA) {
                            setCompareVersionB(version);
                            setViewMode('diff');
                          } else {
                            setCompareVersionA(version);
                            setCompareVersionB(null);
                          }
                        } else {
                          toggleVersion(version.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant={version.isPublished ? 'default' : 'outline'}>
                              v{version.version}
                            </Badge>
                            {version.isCurrent && (
                              <Badge className="bg-green-500 text-white">Current</Badge>
                            )}
                            <span className="text-sm text-[var(--ff-text-muted)]">
                              {formatDate(version.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{version.message || 'No description'}</p>
                          <div className="flex items-center gap-2 text-xs text-[var(--ff-text-muted)]">
                            <User className="w-3 h-3" />
                            <span>{version.createdBy.name}</span>
                            <span>•</span>
                            <span>{version.changes.length} changes</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!readOnly && !version.isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestore?.(version);
                              }}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          {!compareMode && (
                            expandedVersions.has(version.id) ? (
                              <ChevronDown className="w-4 h-4 text-[var(--ff-text-muted)]" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--ff-text-muted)]" />
                            )
                          )}
                        </div>
                      </div>

                      {/* Expanded changes */}
                      {expandedVersions.has(version.id) && !compareMode && (
                        <div className="mt-4 pt-4 border-t border-[var(--ff-border)] space-y-2">
                          {version.changes.map((change, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              {getChangeIcon(change.type)}
                              <div className="flex-1">
                                <span className="text-[var(--ff-text-secondary)]">
                                  {change.field}
                                </span>
                                {change.oldValue && (
                                  <span className="text-[var(--ff-text-muted)]">
                                    : {change.oldValue} → {change.newValue}
                                  </span>
                                )}
                                {!change.oldValue && change.newValue && (
                                  <span className="text-[var(--ff-text-muted)]">
                                    : {change.newValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <div className="space-y-2">
              {filteredVersions.map(version => (
                <div
                  key={version.id}
                  className="border border-[var(--ff-border)] rounded-lg p-4 hover:bg-[var(--ff-bg-layer)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant={version.isPublished ? 'default' : 'outline'}>
                        v{version.version}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{version.message}</p>
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          {version.createdBy.name} • {formatDate(version.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!readOnly && !version.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore?.(version)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="diff" className="mt-4">
            {compareVersionA && compareVersionB ? (
              renderDiff(compareVersionA, compareVersionB)
            ) : (
              <div className="text-center py-8 text-[var(--ff-text-muted)]">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Select two versions to compare</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardGlassContent>
    </CardGlass>
  );
}