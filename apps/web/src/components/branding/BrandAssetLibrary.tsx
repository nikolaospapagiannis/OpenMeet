import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, Download, Trash2, Eye, Search, Filter, Grid, List,
  Image, FileText, Video, Music, Archive, Copy, Check,
  FolderOpen, Plus, Edit2, Share2, Link, Calendar, User,
  ChevronDown, X, MoreVertical, CloudUpload, HardDrive,
  Palette, Layers, FileCode, Zap, Shield, AlertCircle,
  CheckCircle, Info, Settings, Tag, Star, Type
} from 'lucide-react';
import { BrandingConfig } from '@/hooks/useBranding';

interface BrandAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'font' | 'color' | 'template' | 'other';
  category: 'logo' | 'icon' | 'banner' | 'background' | 'marketing' | 'email' | 'social' | 'general';
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  uploadedAt: Date;
  uploadedBy: string;
  tags: string[];
  description?: string;
  variants?: Array<{
    name: string;
    url: string;
    dimensions?: { width: number; height: number };
  }>;
  metadata?: Record<string, any>;
  isPublic: boolean;
  usageCount: number;
  lastUsed?: Date;
  colorPalette?: string[];
  approved: boolean;
  version: number;
}

interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
  createdAt: Date;
  createdBy: string;
  color?: string;
  icon?: string;
}

interface BrandAssetLibraryProps {
  config: BrandingConfig;
  assets?: BrandAsset[];
  folders?: AssetFolder[];
  onUpload?: (files: File[]) => Promise<BrandAsset[]>;
  onDelete?: (assetId: string) => Promise<void>;
  onUpdate?: (assetId: string, updates: Partial<BrandAsset>) => Promise<void>;
  onDownload?: (asset: BrandAsset) => void;
  onApplyAsset?: (asset: BrandAsset, target: string) => void;
  maxFileSize?: number;
  allowedTypes?: string[];
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'date' | 'size' | 'type' | 'usage';
type FilterCategory = 'all' | BrandAsset['category'];

export function BrandAssetLibrary({
  config,
  assets = [],
  folders = [],
  onUpload,
  onDelete,
  onUpdate,
  onDownload,
  onApplyAsset,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['image/*', 'video/*', 'application/pdf', 'font/*']
}: BrandAssetLibraryProps) {
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [filterType, setFilterType] = useState<BrandAsset['type'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortAscending, setSortAscending] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState<BrandAsset | null>(null);
  const [editingAsset, setEditingAsset] = useState<BrandAsset | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Mock data for demonstration
  const mockAssets: BrandAsset[] = assets.length === 0 ? [
    {
      id: '1',
      name: 'Primary Logo',
      type: 'image',
      category: 'logo',
      url: config.logoUrl || '/logo.svg',
      size: 45678,
      mimeType: 'image/svg+xml',
      dimensions: { width: 200, height: 60 },
      uploadedAt: new Date('2024-12-01'),
      uploadedBy: 'admin@company.com',
      tags: ['logo', 'primary', 'light'],
      description: 'Main company logo for light backgrounds',
      variants: [
        { name: 'Dark Mode', url: config.logoDarkUrl || '/logo-dark.svg', dimensions: { width: 200, height: 60 } },
        { name: 'Square', url: config.logoSquareUrl || '/logo-square.svg', dimensions: { width: 60, height: 60 } }
      ],
      isPublic: true,
      usageCount: 142,
      lastUsed: new Date('2024-12-09'),
      colorPalette: [config.primaryColor, config.secondaryColor],
      approved: true,
      version: 3
    },
    {
      id: '2',
      name: 'Email Header Banner',
      type: 'image',
      category: 'email',
      url: '/email-header.png',
      thumbnailUrl: '/email-header-thumb.png',
      size: 128000,
      mimeType: 'image/png',
      dimensions: { width: 600, height: 200 },
      uploadedAt: new Date('2024-11-15'),
      uploadedBy: 'designer@company.com',
      tags: ['email', 'header', 'banner'],
      description: 'Standard email header for all transactional emails',
      isPublic: false,
      usageCount: 89,
      lastUsed: new Date('2024-12-08'),
      approved: true,
      version: 2
    },
    {
      id: '3',
      name: 'Social Media Kit',
      type: 'template',
      category: 'social',
      url: '/social-kit.zip',
      size: 2456789,
      mimeType: 'application/zip',
      uploadedAt: new Date('2024-11-20'),
      uploadedBy: 'marketing@company.com',
      tags: ['social', 'templates', 'linkedin', 'twitter'],
      description: 'Complete social media template kit',
      isPublic: true,
      usageCount: 34,
      approved: true,
      version: 1
    }
  ] : assets;

  const mockFolders: AssetFolder[] = folders.length === 0 ? [
    {
      id: 'f1',
      name: 'Logos & Icons',
      assetCount: 24,
      createdAt: new Date('2024-01-01'),
      createdBy: 'admin@company.com',
      color: '#3B82F6',
      icon: 'image'
    },
    {
      id: 'f2',
      name: 'Marketing Materials',
      assetCount: 56,
      createdAt: new Date('2024-02-01'),
      createdBy: 'marketing@company.com',
      color: '#10B981',
      icon: 'folder'
    },
    {
      id: 'f3',
      name: 'Email Templates',
      assetCount: 12,
      createdAt: new Date('2024-03-01'),
      createdBy: 'designer@company.com',
      color: '#8B5CF6',
      icon: 'mail'
    }
  ] : folders;

  // Filtering and sorting
  const filteredAssets = mockAssets.filter(asset => {
    const matchesSearch = searchQuery === '' ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      asset.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    const matchesType = filterType === 'all' || asset.type === filterType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'date':
        comparison = a.uploadedAt.getTime() - b.uploadedAt.getTime();
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'usage':
        comparison = a.usageCount - b.usageCount;
        break;
    }

    return sortAscending ? comparison : -comparison;
  });

  // File handling
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onUpload) {
      await handleUpload(files);
    }
  }, [onUpload]);

  const handleUpload = async (files: File[]) => {
    if (!onUpload) return;

    // Validate files
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        console.error(`File ${file.name} exceeds maximum size of ${maxFileSize} bytes`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    try {
      // Simulate upload progress
      validFiles.forEach(file => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      });

      // Upload files
      await onUpload(validFiles);

      // Clear progress
      setUploadProgress({});
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSelectAsset = (assetId: string, multi: boolean = false) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (multi) {
        if (next.has(assetId)) {
          next.delete(assetId);
        } else {
          next.add(assetId);
        }
      } else {
        next.clear();
        next.add(assetId);
      }
      return next;
    });
  };

  const handleCopyAssetUrl = async (asset: BrandAsset) => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopiedAssetId(asset.id);
      setTimeout(() => setCopiedAssetId(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAssetIcon = (type: BrandAsset['type']) => {
    switch (type) {
      case 'image': return Image;
      case 'video': return Video;
      case 'document': return FileText;
      case 'font': return Type;
      case 'template': return Layers;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: BrandAsset['category']) => {
    const colors = {
      logo: 'text-blue-600 bg-blue-50',
      icon: 'text-purple-600 bg-purple-50',
      banner: 'text-green-600 bg-green-50',
      background: 'text-yellow-600 bg-yellow-50',
      marketing: 'text-pink-600 bg-pink-50',
      email: 'text-indigo-600 bg-indigo-50',
      social: 'text-red-600 bg-red-50',
      general: 'text-gray-600 bg-gray-50'
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 space-y-6">
        {/* Upload Button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CloudUpload className="w-4 h-4" />
          Upload Assets
        </button>

        {/* Storage Info */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Storage Used</span>
            <span>4.2 GB / 10 GB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }} />
          </div>
        </div>

        {/* Folders */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Folders</h3>
            <button
              onClick={() => setShowNewFolder(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setCurrentFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                currentFolder === null ? 'bg-white shadow text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              All Assets
              <span className="ml-auto text-xs text-gray-500">{mockAssets.length}</span>
            </button>
            {mockFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentFolder === folder.id ? 'bg-white shadow text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
                {folder.name}
                <span className="ml-auto text-xs text-gray-500">{folder.assetCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories Filter */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Categories</h3>
          <div className="space-y-1">
            {(['all', 'logo', 'icon', 'banner', 'email', 'social', 'marketing'] as FilterCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filterCategory === cat ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                {cat !== 'all' && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({mockAssets.filter(a => a.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">File Types</h3>
          <div className="space-y-1">
            {(['all', 'image', 'video', 'document', 'template'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                  filterType === type ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {type !== 'all' && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({mockAssets.filter(a => a.type === type).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
                <option value="usage">Sort by Usage</option>
                <option value="type">Sort by Type</option>
              </select>

              {selectedAssets.size > 0 && (
                <>
                  <button
                    onClick={() => {
                      selectedAssets.forEach(id => {
                        const asset = mockAssets.find(a => a.id === id);
                        if (asset && onDownload) {
                          onDownload(asset);
                        }
                      });
                    }}
                    className="p-2 text-gray-600 hover:text-gray-900 border rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${selectedAssets.size} selected assets?`)) {
                        selectedAssets.forEach(id => {
                          if (onDelete) onDelete(id);
                        });
                        setSelectedAssets(new Set());
                      }
                    }}
                    className="p-2 text-red-600 hover:text-red-700 border border-red-200 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Selected Count */}
          {selectedAssets.size > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
              <button
                onClick={() => setSelectedAssets(new Set())}
                className="ml-2 text-blue-600 hover:underline"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Asset Grid/List */}
        <div
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-6 ${dragActive ? 'bg-blue-50' : 'bg-gray-50'}`}
        >
          {dragActive && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-500 bg-opacity-10 pointer-events-none">
              <div className="bg-white rounded-lg shadow-xl p-8 border-2 border-dashed border-blue-500">
                <CloudUpload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-900">Drop files to upload</p>
              </div>
            </div>
          )}

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedAssets.map(asset => {
                const AssetIcon = getAssetIcon(asset.type);
                const isSelected = selectedAssets.has(asset.id);

                return (
                  <div
                    key={asset.id}
                    onClick={() => handleSelectAsset(asset.id)}
                    onDoubleClick={() => setShowAssetDetails(asset)}
                    className={`relative group bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`absolute top-2 left-2 z-10 ${isSelected ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      <div className={`w-5 h-5 rounded border-2 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                      } flex items-center justify-center`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    {/* Thumbnail */}
                    <div className="aspect-square p-4 flex items-center justify-center bg-gray-50 rounded-t-lg">
                      {asset.type === 'image' && asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <AssetIcon className="w-12 h-12 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{asset.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(asset.size)}</span>
                        {asset.dimensions && (
                          <span>{asset.dimensions.width}×{asset.dimensions.height}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                          {asset.category}
                        </span>
                        {asset.approved && (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAssetDetails(asset);
                        }}
                        className="p-1 bg-white rounded shadow hover:shadow-md"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAssets.size === sortedAssets.length && sortedAssets.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAssets(new Set(sortedAssets.map(a => a.id)));
                          } else {
                            setSelectedAssets(new Set());
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedAssets.map(asset => {
                    const AssetIcon = getAssetIcon(asset.type);
                    const isSelected = selectedAssets.has(asset.id);

                    return (
                      <tr
                        key={asset.id}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectAsset(asset.id, true)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AssetIcon className="w-5 h-5 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                              {asset.description && (
                                <div className="text-xs text-gray-500">{asset.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{asset.type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(asset.category)}`}>
                            {asset.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(asset.size)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {asset.uploadedAt.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{asset.usageCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyAssetUrl(asset)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              {copiedAssetId === asset.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => onDownload?.(asset)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowAssetDetails(asset)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${asset.name}?`)) {
                                  onDelete?.(asset.id);
                                }
                              }}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upload Assets</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop files here, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-gray-500">
                Maximum file size: {formatFileSize(maxFileSize)}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleUpload(files);
                  }
                }}
                className="hidden"
              />
            </div>

            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(uploadProgress).map(([filename, progress]) => (
                  <div key={filename}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{filename}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset Details Modal */}
      {showAssetDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{showAssetDetails.name}</h2>
              <button
                onClick={() => setShowAssetDetails(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Preview */}
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center aspect-square">
                    {showAssetDetails.type === 'image' ? (
                      <img
                        src={showAssetDetails.url}
                        alt={showAssetDetails.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        {React.createElement(getAssetIcon(showAssetDetails.type), {
                          className: "w-24 h-24 text-gray-400 mx-auto mb-4"
                        })}
                        <p className="text-gray-600">{showAssetDetails.name}</p>
                      </div>
                    )}
                  </div>

                  {/* Variants */}
                  {showAssetDetails.variants && showAssetDetails.variants.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Variants</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {showAssetDetails.variants.map((variant, idx) => (
                          <div key={idx} className="bg-gray-50 rounded p-2 text-center">
                            <div className="aspect-square bg-white rounded mb-1 flex items-center justify-center">
                              {showAssetDetails.type === 'image' ? (
                                <img
                                  src={variant.url}
                                  alt={variant.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              ) : (
                                <Image className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">{variant.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Asset Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Type:</dt>
                        <dd className="text-gray-900">{showAssetDetails.type}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Category:</dt>
                        <dd>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(showAssetDetails.category)}`}>
                            {showAssetDetails.category}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Size:</dt>
                        <dd className="text-gray-900">{formatFileSize(showAssetDetails.size)}</dd>
                      </div>
                      {showAssetDetails.dimensions && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Dimensions:</dt>
                          <dd className="text-gray-900">
                            {showAssetDetails.dimensions.width} × {showAssetDetails.dimensions.height}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Format:</dt>
                        <dd className="text-gray-900">{showAssetDetails.mimeType}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Version:</dt>
                        <dd className="text-gray-900">v{showAssetDetails.version}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Description */}
                  {showAssetDetails.description && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                      <p className="text-sm text-gray-600">{showAssetDetails.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {showAssetDetails.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Color Palette */}
                  {showAssetDetails.colorPalette && showAssetDetails.colorPalette.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Color Palette</h3>
                      <div className="flex gap-2">
                        {showAssetDetails.colorPalette.map((color, idx) => (
                          <div key={idx} className="text-center">
                            <div
                              className="w-12 h-12 rounded-lg shadow-sm border"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-xs text-gray-500 mt-1">{color}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Usage Stats */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Usage Statistics</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Total Uses:</dt>
                        <dd className="text-gray-900">{showAssetDetails.usageCount}</dd>
                      </div>
                      {showAssetDetails.lastUsed && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Last Used:</dt>
                          <dd className="text-gray-900">{showAssetDetails.lastUsed.toLocaleDateString()}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Uploaded:</dt>
                        <dd className="text-gray-900">{showAssetDetails.uploadedAt.toLocaleDateString()}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Uploaded By:</dt>
                        <dd className="text-gray-900">{showAssetDetails.uploadedBy}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => handleCopyAssetUrl(showAssetDetails)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      {copiedAssetId === showAssetDetails.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4" />
                          Copy URL
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDownload?.(showAssetDetails)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    {onApplyAsset && (
                      <button
                        onClick={() => {
                          onApplyAsset(showAssetDetails, 'logo');
                          setShowAssetDetails(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Zap className="w-4 h-4" />
                        Apply as Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}