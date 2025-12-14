import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface Template {
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
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  permissions?: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  metadata?: {
    version: string;
    isPublic: boolean;
    isDraft: boolean;
    lastUsed?: Date;
    favorited: boolean;
    sharedWith: number;
  };
}

interface CreateTemplateData {
  name: string;
  description: string;
  category: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  tags?: string[];
  variables?: string[];
  isPublic?: boolean;
  isDraft?: boolean;
}

interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id?: string;
}

interface TemplateFilters {
  category?: string;
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  isDraft?: boolean;
  createdBy?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  changes: any[];
  createdAt: Date;
  createdBy: any;
}

interface UseTemplatesReturn {
  // Data
  templates: Template[];
  template: Template | null;
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;

  // CRUD Operations
  createTemplate: (data: CreateTemplateData) => Promise<Template>;
  updateTemplate: (id: string, data: UpdateTemplateData) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string, newName?: string) => Promise<Template>;

  // Fetching
  fetchTemplates: (filters?: TemplateFilters) => Promise<void>;
  fetchTemplate: (id: string) => Promise<Template>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Template Actions
  applyTemplate: (templateId: string, meetingId: string, variables?: Record<string, string>) => Promise<any>;
  previewTemplate: (templateId: string, variables?: Record<string, string>) => Promise<string>;
  exportTemplate: (templateId: string, format?: 'json' | 'markdown') => Promise<Blob>;
  importTemplate: (file: File) => Promise<Template>;

  // Sharing & Permissions
  shareTemplate: (templateId: string, emails: string[], permissions?: string) => Promise<boolean>;
  updatePermissions: (templateId: string, userId: string, permissions: any) => Promise<boolean>;
  makePublic: (templateId: string) => Promise<boolean>;
  makePrivate: (templateId: string) => Promise<boolean>;

  // Versioning
  getVersionHistory: (templateId: string) => Promise<TemplateVersion[]>;
  restoreVersion: (templateId: string, versionId: string) => Promise<Template>;
  compareVersions: (templateId: string, versionA: string, versionB: string) => Promise<any>;

  // Favorites & Recent
  favoriteTemplate: (templateId: string) => Promise<boolean>;
  unfavoriteTemplate: (templateId: string) => Promise<boolean>;
  getFavorites: () => Promise<Template[]>;
  getRecent: (limit?: number) => Promise<Template[]>;

  // Categories & Tags
  getCategories: () => Promise<string[]>;
  getTags: () => Promise<string[]>;
  addTag: (templateId: string, tag: string) => Promise<boolean>;
  removeTag: (templateId: string, tag: string) => Promise<boolean>;

  // Search & Filter
  searchTemplates: (query: string) => Promise<Template[]>;
  filterByCategory: (category: string) => void;
  filterByTags: (tags: string[]) => void;
  clearFilters: () => void;

  // Bulk Operations
  bulkDelete: (templateIds: string[]) => Promise<boolean>;
  bulkUpdateCategory: (templateIds: string[], category: string) => Promise<boolean>;
  bulkAddTags: (templateIds: string[], tags: string[]) => Promise<boolean>;

  // Statistics
  getTemplateStats: (templateId: string) => Promise<any>;
  getUsageAnalytics: (templateId: string, period?: string) => Promise<any>;
}

export function useTemplates(): UseTemplatesReturn {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<TemplateFilters>({});
  const [currentOffset, setCurrentOffset] = useState(0);

  // Fetch templates with filters
  const fetchTemplates = useCallback(async (filters?: TemplateFilters) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.tags) params.append('tags', filters.tags.join(','));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.isPublic !== undefined) params.append('isPublic', String(filters.isPublic));
      if (filters?.isDraft !== undefined) params.append('isDraft', String(filters.isDraft));
      if (filters?.createdBy) params.append('createdBy', filters.createdBy);
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const response = await apiClient.get(`/templates?${params.toString()}`);

      if (response.data.success) {
        setTemplates(response.data.templates || []);
        setTotalCount(response.data.totalCount || 0);
        setHasMore(response.data.hasMore || false);
        setCurrentFilters(filters || {});
        setCurrentOffset(filters?.offset || 0);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single template
  const fetchTemplate = useCallback(async (id: string): Promise<Template> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/templates/${id}`);

      if (response.data.success) {
        const fetchedTemplate = response.data.template;
        setTemplate(fetchedTemplate);
        return fetchedTemplate;
      }

      throw new Error('Template not found');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new template
  const createTemplate = useCallback(async (data: CreateTemplateData): Promise<Template> => {
    try {
      setLoading(true);
      setError(null);

      // Extract variables from sections
      const variables = new Set<string>();
      data.sections.forEach(section => {
        const matches = section.content.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach(match => variables.add(match));
        }
      });

      const templateData = {
        ...data,
        variables: data.variables || Array.from(variables),
        createdBy: user?.id,
        isPreBuilt: false,
        usageCount: 0
      };

      const response = await apiClient.post('/templates', templateData);

      if (response.data.success) {
        const newTemplate = response.data.template;
        setTemplates(prev => [newTemplate, ...prev]);
        return newTemplate;
      }

      throw new Error('Failed to create template');
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update template
  const updateTemplate = useCallback(async (id: string, data: UpdateTemplateData): Promise<Template> => {
    try {
      setLoading(true);
      setError(null);

      // Extract variables if sections are updated
      if (data.sections) {
        const variables = new Set<string>();
        data.sections.forEach(section => {
          const matches = section.content.match(/\{\{([^}]+)\}\}/g);
          if (matches) {
            matches.forEach(match => variables.add(match));
          }
        });
        data.variables = Array.from(variables);
      }

      const response = await apiClient.patch(`/templates/${id}`, data);

      if (response.data.success) {
        const updatedTemplate = response.data.template;
        setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
        if (template?.id === id) {
          setTemplate(updatedTemplate);
        }
        return updatedTemplate;
      }

      throw new Error('Failed to update template');
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [template]);

  // Delete template
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.delete(`/templates/${id}`);

      if (response.data.success) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        if (template?.id === id) {
          setTemplate(null);
        }
        return true;
      }

      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [template]);

  // Duplicate template
  const duplicateTemplate = useCallback(async (id: string, newName?: string): Promise<Template> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post(`/templates/${id}/duplicate`, {
        name: newName
      });

      if (response.data.success) {
        const duplicatedTemplate = response.data.template;
        setTemplates(prev => [duplicatedTemplate, ...prev]);
        return duplicatedTemplate;
      }

      throw new Error('Failed to duplicate template');
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate template');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply template to meeting
  const applyTemplate = useCallback(async (
    templateId: string,
    meetingId: string,
    variables?: Record<string, string>
  ): Promise<any> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/apply`, {
        meetingId,
        variables: variables || {}
      });

      if (response.data.success) {
        return response.data.result;
      }

      throw new Error('Failed to apply template');
    } catch (err: any) {
      setError(err.message || 'Failed to apply template');
      throw err;
    }
  }, []);

  // Preview template with variables
  const previewTemplate = useCallback(async (
    templateId: string,
    variables?: Record<string, string>
  ): Promise<string> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/preview`, {
        variables: variables || {}
      });

      if (response.data.success) {
        return response.data.preview;
      }

      throw new Error('Failed to preview template');
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Export template
  const exportTemplate = useCallback(async (
    templateId: string,
    format: 'json' | 'markdown' = 'json'
  ): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/templates/${templateId}/export`, {
        params: { format },
        responseType: 'blob'
      });

      return response.data;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Import template
  const importTemplate = useCallback(async (file: File): Promise<Template> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/templates/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        const importedTemplate = response.data.template;
        setTemplates(prev => [importedTemplate, ...prev]);
        return importedTemplate;
      }

      throw new Error('Failed to import template');
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Share template
  const shareTemplate = useCallback(async (
    templateId: string,
    emails: string[],
    permissions: string = 'viewer'
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/share`, {
        emails,
        permissions
      });

      return response.data.success;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Update permissions
  const updatePermissions = useCallback(async (
    templateId: string,
    userId: string,
    permissions: any
  ): Promise<boolean> => {
    try {
      const response = await apiClient.patch(`/templates/${templateId}/permissions/${userId}`, {
        permissions
      });

      return response.data.success;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Make template public
  const makePublic = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const response = await apiClient.patch(`/templates/${templateId}`, {
        isPublic: true
      });

      return response.data.success;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Make template private
  const makePrivate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const response = await apiClient.patch(`/templates/${templateId}`, {
        isPublic: false
      });

      return response.data.success;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get version history
  const getVersionHistory = useCallback(async (templateId: string): Promise<TemplateVersion[]> => {
    try {
      const response = await apiClient.get(`/templates/${templateId}/versions`);

      if (response.data.success) {
        return response.data.versions;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Restore version
  const restoreVersion = useCallback(async (
    templateId: string,
    versionId: string
  ): Promise<Template> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/versions/${versionId}/restore`);

      if (response.data.success) {
        const restoredTemplate = response.data.template;
        setTemplates(prev => prev.map(t => t.id === templateId ? restoredTemplate : t));
        return restoredTemplate;
      }

      throw new Error('Failed to restore version');
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Compare versions
  const compareVersions = useCallback(async (
    templateId: string,
    versionA: string,
    versionB: string
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`/templates/${templateId}/versions/compare`, {
        params: { versionA, versionB }
      });

      return response.data.diff;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Favorite template
  const favoriteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/favorite`);

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, metadata: { ...t.metadata, favorited: true } }
            : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Unfavorite template
  const unfavoriteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/templates/${templateId}/favorite`);

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, metadata: { ...t.metadata, favorited: false } }
            : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get favorites
  const getFavorites = useCallback(async (): Promise<Template[]> => {
    try {
      const response = await apiClient.get('/templates/favorites');

      if (response.data.success) {
        return response.data.templates;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get recent templates
  const getRecent = useCallback(async (limit: number = 10): Promise<Template[]> => {
    try {
      const response = await apiClient.get('/templates/recent', {
        params: { limit }
      });

      if (response.data.success) {
        return response.data.templates;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get categories
  const getCategories = useCallback(async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/templates/categories');

      if (response.data.success) {
        return response.data.categories;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get tags
  const getTags = useCallback(async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/templates/tags');

      if (response.data.success) {
        return response.data.tags;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Add tag
  const addTag = useCallback(async (templateId: string, tag: string): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/templates/${templateId}/tags`, { tag });

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, tags: [...t.tags, tag] }
            : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Remove tag
  const removeTag = useCallback(async (templateId: string, tag: string): Promise<boolean> => {
    try {
      const response = await apiClient.delete(`/templates/${templateId}/tags/${tag}`);

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, tags: t.tags.filter(tg => tg !== tag) }
            : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Search templates
  const searchTemplates = useCallback(async (query: string): Promise<Template[]> => {
    try {
      const response = await apiClient.get('/templates/search', {
        params: { q: query }
      });

      if (response.data.success) {
        return response.data.templates;
      }

      return [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Filter by category
  const filterByCategory = useCallback((category: string) => {
    setCurrentFilters(prev => ({ ...prev, category }));
    fetchTemplates({ ...currentFilters, category });
  }, [currentFilters, fetchTemplates]);

  // Filter by tags
  const filterByTags = useCallback((tags: string[]) => {
    setCurrentFilters(prev => ({ ...prev, tags }));
    fetchTemplates({ ...currentFilters, tags });
  }, [currentFilters, fetchTemplates]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setCurrentFilters({});
    fetchTemplates({});
  }, [fetchTemplates]);

  // Bulk delete
  const bulkDelete = useCallback(async (templateIds: string[]): Promise<boolean> => {
    try {
      const response = await apiClient.post('/templates/bulk/delete', {
        templateIds
      });

      if (response.data.success) {
        setTemplates(prev => prev.filter(t => !templateIds.includes(t.id)));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Bulk update category
  const bulkUpdateCategory = useCallback(async (
    templateIds: string[],
    category: string
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post('/templates/bulk/category', {
        templateIds,
        category
      });

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          templateIds.includes(t.id) ? { ...t, category } : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Bulk add tags
  const bulkAddTags = useCallback(async (
    templateIds: string[],
    tags: string[]
  ): Promise<boolean> => {
    try {
      const response = await apiClient.post('/templates/bulk/tags', {
        templateIds,
        tags
      });

      if (response.data.success) {
        setTemplates(prev => prev.map(t =>
          templateIds.includes(t.id)
            ? { ...t, tags: [...new Set([...t.tags, ...tags])] }
            : t
        ));
        return true;
      }

      return false;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get template stats
  const getTemplateStats = useCallback(async (templateId: string): Promise<any> => {
    try {
      const response = await apiClient.get(`/templates/${templateId}/stats`);

      if (response.data.success) {
        return response.data.stats;
      }

      return null;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Get usage analytics
  const getUsageAnalytics = useCallback(async (
    templateId: string,
    period: string = '30d'
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`/templates/${templateId}/analytics`, {
        params: { period }
      });

      if (response.data.success) {
        return response.data.analytics;
      }

      return null;
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Load more templates
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const newOffset = currentOffset + (currentFilters.limit || 20);
    const filters = { ...currentFilters, offset: newOffset };

    try {
      setLoading(true);
      const response = await apiClient.get(`/templates?${new URLSearchParams(filters as any)}`);

      if (response.data.success) {
        setTemplates(prev => [...prev, ...(response.data.templates || [])]);
        setHasMore(response.data.hasMore || false);
        setCurrentOffset(newOffset);
      }
    } catch (err: any) {
      console.error('Error loading more templates:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, currentOffset, currentFilters]);

  // Refresh templates
  const refresh = useCallback(() => {
    return fetchTemplates(currentFilters);
  }, [fetchTemplates, currentFilters]);

  // Initial load
  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    // Data
    templates,
    template,
    loading,
    error,
    totalCount,
    hasMore,

    // CRUD Operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,

    // Fetching
    fetchTemplates,
    fetchTemplate,
    loadMore,
    refresh,

    // Template Actions
    applyTemplate,
    previewTemplate,
    exportTemplate,
    importTemplate,

    // Sharing & Permissions
    shareTemplate,
    updatePermissions,
    makePublic,
    makePrivate,

    // Versioning
    getVersionHistory,
    restoreVersion,
    compareVersions,

    // Favorites & Recent
    favoriteTemplate,
    unfavoriteTemplate,
    getFavorites,
    getRecent,

    // Categories & Tags
    getCategories,
    getTags,
    addTag,
    removeTag,

    // Search & Filter
    searchTemplates,
    filterByCategory,
    filterByTags,
    clearFilters,

    // Bulk Operations
    bulkDelete,
    bulkUpdateCategory,
    bulkAddTags,

    // Statistics
    getTemplateStats,
    getUsageAnalytics
  };
}