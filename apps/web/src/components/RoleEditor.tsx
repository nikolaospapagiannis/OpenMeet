/**
 * Role Editor Component
 * UI for creating and editing roles with permission selection
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  category?: string;
}

interface PermissionCategory {
  id: string;
  name: string;
  description: string;
}

interface RoleEditorProps {
  initialName?: string;
  initialDescription?: string;
  initialPermissions?: string[];
  onSave: (data: { name: string; description: string; permissions: string[] }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function RoleEditor({
  initialName = '',
  initialDescription = '',
  initialPermissions = [],
  onSave,
  onCancel,
  loading = false,
}: RoleEditorProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(initialPermissions)
  );
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await fetch('/api/rbac/permissions', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data.data || []);
      setCategories(data.categories || []);

      // Expand all categories by default
      const allCategories = new Set<string>((data.categories || []).map((c: any) => c.id as string));
      setExpandedCategories(allCategories);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a role name');
      return;
    }

    if (selectedPermissions.size === 0) {
      alert('Please select at least one permission');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        permissions: Array.from(selectedPermissions),
      });
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to save role'}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permissionName: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionName)) {
      newSelected.delete(permissionName);
    } else {
      newSelected.add(permissionName);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllInCategory = (categoryId: string) => {
    const categoryPermissions = permissions
      .filter((p) => p.category === categoryId)
      .map((p) => p.name);

    const newSelected = new Set(selectedPermissions);
    categoryPermissions.forEach((p) => newSelected.add(p));
    setSelectedPermissions(newSelected);
  };

  const deselectAllInCategory = (categoryId: string) => {
    const categoryPermissions = permissions
      .filter((p) => p.category === categoryId)
      .map((p) => p.name);

    const newSelected = new Set(selectedPermissions);
    categoryPermissions.forEach((p) => newSelected.delete(p));
    setSelectedPermissions(newSelected);
  };

  // Filter permissions by search query
  const filteredPermissions = permissions.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    );
  });

  // Group permissions by category
  const permissionsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = filteredPermissions.filter((p) => p.category === category.id);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Content Manager"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Describe what this role is for..."
            />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Permissions <span className="text-sm text-gray-500 font-normal">({selectedPermissions.size} selected)</span>
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the permissions this role should have
          </p>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Search permissions..."
          />
        </div>

        {loadingPermissions ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading permissions...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const categoryPerms = permissionsByCategory[category.id] || [];
              if (categoryPerms.length === 0) return null;

              const isExpanded = expandedCategories.has(category.id);
              const selectedCount = categoryPerms.filter((p) =>
                selectedPermissions.has(p.name)
              ).length;

              return (
                <div key={category.id} className="border border-gray-200 rounded-lg">
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{category.name}</div>
                        <div className="text-xs text-gray-600">{category.description}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {selectedCount}/{categoryPerms.length}
                      </span>
                      {selectedCount === categoryPerms.length ? (
                        <button
                          type="button"
                          onClick={() => deselectAllInCategory(category.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Deselect All
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => selectAllInCategory(category.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Select All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Permissions */}
                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {categoryPerms.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.name)}
                              onChange={() => togglePermission(permission.name)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {permission.name}
                              </span>
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                {permission.action}
                              </span>
                            </div>
                            {permission.description && (
                              <p className="text-xs text-gray-600 mt-0.5">
                                {permission.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || loadingPermissions}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save Role
            </>
          )}
        </button>
      </div>
    </form>
  );
}
