'use client';

import { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Plus,
  Edit2,
  Trash2,
  Hash,
  Tag,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Clock,
  Star,
  Settings,
  Move,
  Copy,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CardGlass, CardGlassContent, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  parentId?: string;
  templateCount: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    order: number;
    visibility: 'public' | 'private' | 'team';
    requiredVariables?: string[];
    defaultTags?: string[];
  };
}

interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  categoryIds: string[];
  createdAt: Date;
  trending?: boolean;
}

interface CategoryStats {
  totalTemplates: number;
  activeTemplates: number;
  recentlyUsed: number;
  averageUsage: number;
  topTags: string[];
}

interface TemplateCategoriesProps {
  categories?: Category[];
  tags?: Tag[];
  selectedCategory?: string;
  selectedTags?: string[];
  onCategorySelect?: (categoryId: string) => void;
  onTagSelect?: (tagId: string) => void;
  onCategoryCreate?: (category: Partial<Category>) => void;
  onCategoryUpdate?: (categoryId: string, updates: Partial<Category>) => void;
  onCategoryDelete?: (categoryId: string) => void;
  onTagCreate?: (tag: Partial<Tag>) => void;
  onTagUpdate?: (tagId: string, updates: Partial<Tag>) => void;
  onTagDelete?: (tagId: string) => void;
  readOnly?: boolean;
}

export default function TemplateCategories({
  categories: propCategories,
  tags: propTags,
  selectedCategory,
  selectedTags = [],
  onCategorySelect,
  onTagSelect,
  onCategoryCreate,
  onCategoryUpdate,
  onCategoryDelete,
  onTagCreate,
  onTagUpdate,
  onTagDelete,
  readOnly = false
}: TemplateCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  const [tags, setTags] = useState<Tag[]>(propTags || []);
  const [loading, setLoading] = useState(!propCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'categories' | 'tags' | 'analytics'>('categories');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState<'category' | 'tag'>('category');
  const [editingItem, setEditingItem] = useState<Category | Tag | null>(null);
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({});

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#9333ea',
    icon: 'folder',
    parentId: '',
    visibility: 'public' as 'public' | 'private' | 'team'
  });

  // Predefined colors
  const colors = [
    '#9333ea', // Purple
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  // Icon options
  const iconOptions = [
    { value: 'folder', icon: Folder, label: 'Folder' },
    { value: 'tag', icon: Tag, label: 'Tag' },
    { value: 'hash', icon: Hash, label: 'Hash' },
    { value: 'star', icon: Star, label: 'Star' },
    { value: 'clock', icon: Clock, label: 'Clock' },
    { value: 'chart', icon: BarChart3, label: 'Chart' }
  ];

  // Mock data if not provided
  useEffect(() => {
    if (!propCategories) {
      const mockCategories: Category[] = [
        {
          id: 'sales',
          name: 'Sales',
          description: 'Sales-related templates',
          color: '#9333ea',
          icon: 'folder',
          templateCount: 12,
          isSystem: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-12-09'),
          metadata: {
            order: 1,
            visibility: 'public',
            requiredVariables: ['{{sales.prospect}}', '{{sales.value}}'],
            defaultTags: ['discovery', 'demo', 'negotiation']
          }
        },
        {
          id: 'customer-success',
          name: 'Customer Success',
          description: 'CS team templates',
          color: '#10b981',
          icon: 'star',
          templateCount: 8,
          isSystem: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-12-08'),
          metadata: {
            order: 2,
            visibility: 'public',
            defaultTags: ['onboarding', 'check-in', 'renewal']
          }
        },
        {
          id: 'internal',
          name: 'Internal',
          description: 'Internal meeting templates',
          color: '#3b82f6',
          icon: 'folder',
          templateCount: 15,
          isSystem: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-12-07'),
          metadata: {
            order: 3,
            visibility: 'team',
            defaultTags: ['team-meeting', 'standup', '1-on-1']
          }
        },
        {
          id: 'interview',
          name: 'Interview',
          description: 'Recruitment templates',
          color: '#f59e0b',
          icon: 'tag',
          parentId: 'internal',
          templateCount: 5,
          isSystem: false,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-12-06'),
          metadata: {
            order: 1,
            visibility: 'team',
            requiredVariables: ['{{interview.candidate}}', '{{interview.position}}'],
            defaultTags: ['screening', 'technical', 'cultural']
          }
        },
        {
          id: 'project',
          name: 'Project',
          description: 'Project management templates',
          color: '#8b5cf6',
          icon: 'chart',
          templateCount: 10,
          isSystem: false,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-12-05'),
          metadata: {
            order: 4,
            visibility: 'public',
            requiredVariables: ['{{project.name}}', '{{project.sprint}}'],
            defaultTags: ['planning', 'retrospective', 'review']
          }
        }
      ];

      const mockTags: Tag[] = [
        { id: '1', name: 'discovery', color: '#9333ea', usageCount: 45, categoryIds: ['sales'], createdAt: new Date(), trending: true },
        { id: '2', name: 'demo', color: '#3b82f6', usageCount: 38, categoryIds: ['sales'], createdAt: new Date() },
        { id: '3', name: 'onboarding', color: '#10b981', usageCount: 32, categoryIds: ['customer-success'], createdAt: new Date(), trending: true },
        { id: '4', name: 'standup', color: '#f59e0b', usageCount: 67, categoryIds: ['internal'], createdAt: new Date(), trending: true },
        { id: '5', name: 'technical', color: '#ef4444', usageCount: 23, categoryIds: ['interview'], createdAt: new Date() },
        { id: '6', name: 'planning', color: '#8b5cf6', usageCount: 41, categoryIds: ['project'], createdAt: new Date() },
        { id: '7', name: 'retrospective', color: '#ec4899', usageCount: 29, categoryIds: ['project'], createdAt: new Date() },
        { id: '8', name: '1-on-1', color: '#6366f1', usageCount: 54, categoryIds: ['internal'], createdAt: new Date(), trending: true },
        { id: '9', name: 'quarterly', color: '#14b8a6', usageCount: 18, categoryIds: ['sales', 'customer-success'], createdAt: new Date() },
        { id: '10', name: 'urgent', color: '#f97316', usageCount: 12, categoryIds: [], createdAt: new Date() }
      ];

      // Mock stats
      const mockStats: Record<string, CategoryStats> = {};
      mockCategories.forEach(cat => {
        mockStats[cat.id] = {
          totalTemplates: cat.templateCount,
          activeTemplates: Math.floor(cat.templateCount * 0.8),
          recentlyUsed: Math.floor(cat.templateCount * 0.6),
          averageUsage: Math.floor(Math.random() * 50 + 10),
          topTags: mockTags
            .filter(tag => tag.categoryIds.includes(cat.id))
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 3)
            .map(tag => tag.name)
        };
      });

      setCategories(mockCategories);
      setTags(mockTags);
      setCategoryStats(mockStats);
      setLoading(false);
    }
  }, [propCategories, propTags]);

  // Filter items based on search
  const filterItems = <T extends { name: string }>(items: T[]): T[] => {
    if (!searchQuery) return items;
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Get category tree structure
  const getCategoryTree = (): Category[] => {
    const filtered = filterItems(categories);
    const rootCategories = filtered.filter(c => !c.parentId);

    const addChildren = (parent: Category): Category & { children?: Category[] } => {
      const children = filtered.filter(c => c.parentId === parent.id);
      return {
        ...parent,
        children: children.length > 0 ? children.map(addChildren) : undefined
      };
    };

    return rootCategories.map(addChildren);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Handle create/edit
  const handleSave = () => {
    if (createType === 'category') {
      const newCategory: Partial<Category> = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        parentId: formData.parentId || undefined,
        isSystem: false,
        templateCount: 0,
        metadata: {
          order: categories.length,
          visibility: formData.visibility,
          defaultTags: []
        }
      };

      if (editingItem && 'templateCount' in editingItem) {
        onCategoryUpdate?.(editingItem.id, newCategory);
      } else {
        onCategoryCreate?.(newCategory);
      }
    } else {
      const newTag: Partial<Tag> = {
        name: formData.name,
        color: formData.color,
        usageCount: 0,
        categoryIds: []
      };

      if (editingItem && 'usageCount' in editingItem) {
        onTagUpdate?.(editingItem.id, newTag);
      } else {
        onTagCreate?.(newTag);
      }
    }

    setShowCreateDialog(false);
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      color: '#9333ea',
      icon: 'folder',
      parentId: '',
      visibility: 'public'
    });
  };

  // Render category tree
  const renderCategoryTree = (category: Category & { children?: Category[] }, level = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;
    const stats = categoryStats[category.id];

    return (
      <div key={category.id}>
        <div
          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[var(--ff-purple-500)]/20 border border-[var(--ff-purple-500)]'
              : 'hover:bg-[var(--ff-bg-layer)]'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => onCategorySelect?.(category.id)}
        >
          <div className="flex items-center gap-3">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategoryExpansion(category.id);
                }}
                className="p-1"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {isExpanded ? (
                <FolderOpen className="w-4 h-4" style={{ color: category.color }} />
              ) : (
                <Folder className="w-4 h-4" style={{ color: category.color }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{category.name}</p>
                {category.isSystem && (
                  <Badge variant="outline" className="text-xs">System</Badge>
                )}
                {category.metadata?.visibility === 'private' && (
                  <Badge variant="outline" className="text-xs border-red-500 text-red-500">Private</Badge>
                )}
              </div>
              <p className="text-xs text-[var(--ff-text-muted)]">
                {category.templateCount} templates
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && (
              <div className="text-right mr-4">
                <p className="text-xs text-[var(--ff-text-muted)]">
                  {stats.averageUsage} avg uses/month
                </p>
              </div>
            )}
            {!readOnly && !category.isSystem && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem(category);
                    setFormData({
                      name: category.name,
                      description: category.description,
                      color: category.color,
                      icon: category.icon,
                      parentId: category.parentId || '',
                      visibility: category.metadata?.visibility || 'public'
                    });
                    setCreateType('category');
                    setShowCreateDialog(true);
                  }}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete category "${category.name}"?`)) {
                      onCategoryDelete?.(category.id);
                    }
                  }}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children!.map(child => renderCategoryTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <CardGlass>
      <CardGlassHeader>
        <div className="flex items-center justify-between">
          <CardGlassTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Categories & Tags
          </CardGlassTitle>
          {!readOnly && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateType('category');
                  setShowCreateDialog(true);
                }}
                className="border-[var(--ff-border)]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Category
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreateType('tag');
                  setShowCreateDialog(true);
                }}
                className="border-[var(--ff-border)]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Tag
              </Button>
            </div>
          )}
        </div>
      </CardGlassHeader>
      <CardGlassContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--ff-text-muted)] w-4 h-4" />
          <Input
            type="text"
            placeholder="Search categories and tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[var(--ff-bg-layer)] border-[var(--ff-border)]"
          />
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-2">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-[var(--ff-bg-layer)] rounded-lg" />
                ))}
              </div>
            ) : (
              getCategoryTree().map(category => renderCategoryTree(category))
            )}
          </TabsContent>

          <TabsContent value="tags" className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {filterItems(tags)
                .sort((a, b) => b.usageCount - a.usageCount)
                .map(tag => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'border-[var(--ff-purple-500)] bg-[var(--ff-purple-500)]/10'
                        : 'border-[var(--ff-border)] hover:bg-[var(--ff-bg-layer)]'
                    }`}
                    onClick={() => onTagSelect?.(tag.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" style={{ color: tag.color }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{tag.name}</p>
                          {tag.trending && (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          Used {tag.usageCount} times
                        </p>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem(tag);
                            setFormData({
                              name: tag.name,
                              description: '',
                              color: tag.color,
                              icon: 'tag',
                              parentId: '',
                              visibility: 'public'
                            });
                            setCreateType('tag');
                            setShowCreateDialog(true);
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete tag "${tag.name}"?`)) {
                              onTagDelete?.(tag.id);
                            }
                          }}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {categories.map(category => {
              const stats = categoryStats[category.id];
              if (!stats) return null;

              return (
                <div key={category.id} className="border border-[var(--ff-border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Folder className="w-5 h-5" style={{ color: category.color }} />
                      </div>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-[var(--ff-text-muted)]">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {stats.totalTemplates} templates
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-[var(--ff-text-muted)]">Active</p>
                      <p className="font-semibold">{stats.activeTemplates}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--ff-text-muted)]">Recent</p>
                      <p className="font-semibold">{stats.recentlyUsed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--ff-text-muted)]">Avg Usage</p>
                      <p className="font-semibold">{stats.averageUsage}/mo</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--ff-text-muted)]">Efficiency</p>
                      <p className="font-semibold">
                        {Math.round((stats.activeTemplates / stats.totalTemplates) * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--ff-text-muted)]">Template Usage</span>
                      <span>{Math.round((stats.activeTemplates / stats.totalTemplates) * 100)}%</span>
                    </div>
                    <Progress
                      value={(stats.activeTemplates / stats.totalTemplates) * 100}
                      className="h-2"
                    />
                  </div>

                  {stats.topTags.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-[var(--ff-text-muted)] mb-2">Top Tags</p>
                      <div className="flex gap-1">
                        {stats.topTags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        {showCreateDialog && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit' : 'Create'} {createType === 'category' ? 'Category' : 'Tag'}
                </DialogTitle>
                <DialogDescription>
                  {createType === 'category'
                    ? 'Organize your templates into categories'
                    : 'Add tags to make templates easier to find'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={createType === 'category' ? 'e.g., Marketing' : 'e.g., urgent'}
                    className="mt-1"
                  />
                </div>

                {createType === 'category' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description..."
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Parent Category</label>
                      <select
                        value={formData.parentId}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                        className="mt-1 w-full p-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg"
                      >
                        <option value="">None (Top Level)</option>
                        {categories
                          .filter(c => c.id !== editingItem?.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Visibility</label>
                      <select
                        value={formData.visibility}
                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                        className="mt-1 w-full p-2 bg-[var(--ff-bg-layer)] border border-[var(--ff-border)] rounded-lg"
                      >
                        <option value="public">Public</option>
                        <option value="team">Team Only</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium">Color</label>
                  <div className="mt-1 flex gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-[var(--ff-purple-500)]' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!formData.name}
                    className="bg-[var(--ff-purple-500)] hover:bg-[var(--ff-purple-600)] text-white"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardGlassContent>
    </CardGlass>
  );
}