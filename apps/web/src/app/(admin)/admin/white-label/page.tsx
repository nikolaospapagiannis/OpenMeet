'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Eye,
  Trash2,
  Upload,
  X,
  Loader2,
  Globe,
  Palette,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Copy,
  Mail,
  RefreshCw,
  Image,
} from 'lucide-react';

type ConfigurationStatus = 'draft' | 'published' | 'unpublished';

interface BrandingConfig {
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
}

interface DomainConfig {
  customDomain: string | null;
  sslEnabled: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verificationToken: string | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

interface FeatureConfig {
  enableRecording: boolean;
  enableTranscription: boolean;
  enableAiAnalysis: boolean;
  enableIntegrations: boolean;
  enableApiAccess: boolean;
  enableCustomReports: boolean;
  maxParticipantsPerMeeting: number;
  maxRecordingDurationMinutes: number;
  storageLimitGb: number;
}

interface AdvancedConfig {
  customCss: string;
  customJs: string;
  analytics: {
    googleAnalyticsId: string | null;
    enabled: boolean;
  };
  support: {
    email: string | null;
    url: string | null;
  };
  legal: {
    privacyPolicyUrl: string | null;
    termsOfServiceUrl: string | null;
  };
  metaTags: Record<string, string>;
}

interface Asset {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

interface WhiteLabelConfig {
  id: string;
  organizationId: string;
  organizationName: string;
  status: ConfigurationStatus;
  branding: BrandingConfig;
  domain: DomainConfig;
  emailTemplates: EmailTemplate[];
  features: FeatureConfig;
  advanced: AdvancedConfig;
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-md border border-gray-300 cursor-pointer relative overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="#000000"
          className="w-28 font-mono text-sm"
        />
      </div>
    </div>
  );
}

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
}

function ImageUpload({ value, onChange, label, onUpload, accept = 'image/*' }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
          isUploading && 'opacity-50 pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {value ? (
          <div className="space-y-2">
            <img src={value} alt={label} className="max-h-24 mx-auto object-contain" />
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-1">Change</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange('')}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
                <span className="ml-1">Remove</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center">
              {isUploading ? (
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              ) : (
                <Image className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Drop an image here</span> or{' '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                browse
              </button>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, SVG up to 5MB</p>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept={accept} onChange={handleFileSelect} className="hidden" />
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

interface LivePreviewProps {
  config: WhiteLabelConfig;
}

function LivePreview({ config }: LivePreviewProps) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: config.branding.backgroundColor,
        fontFamily: config.branding.fontFamily,
      }}
    >
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: config.branding.primaryColor }}
      >
        {config.branding.logoUrl ? (
          <img src={config.branding.logoUrl} alt="Logo" className="h-8 object-contain" />
        ) : (
          <div className="h-8 w-8 rounded bg-white/20" />
        )}
        <span className="font-semibold text-white">{config.branding.brandName || 'Brand Name'}</span>
      </div>
      <div className="p-4 space-y-4">
        <div
          className="h-4 rounded"
          style={{
            backgroundColor: config.branding.textColor,
            opacity: 0.8,
            width: '75%',
          }}
        />
        <div
          className="h-4 rounded"
          style={{
            backgroundColor: config.branding.textColor,
            opacity: 0.6,
            width: '60%',
          }}
        />
        <div className="flex gap-2 mt-4">
          <button
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{
              backgroundColor: config.branding.primaryColor,
              borderRadius: config.branding.borderRadius,
            }}
          >
            Primary
          </button>
          <button
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{
              backgroundColor: config.branding.secondaryColor,
              borderRadius: config.branding.borderRadius,
            }}
          >
            Secondary
          </button>
          <button
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{
              backgroundColor: config.branding.accentColor,
              borderRadius: config.branding.borderRadius,
            }}
          >
            Accent
          </button>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_BRANDING: BrandingConfig = {
  brandName: '',
  logoUrl: '',
  faviconUrl: '',
  primaryColor: '#0066cc',
  secondaryColor: '#4d4d4d',
  accentColor: '#00cc66',
  backgroundColor: '#ffffff',
  textColor: '#333333',
  fontFamily: 'Inter',
  borderRadius: 8,
};

const DEFAULT_DOMAIN: DomainConfig = {
  customDomain: null,
  sslEnabled: true,
  verificationStatus: 'pending',
  verificationToken: null,
};

const DEFAULT_FEATURES: FeatureConfig = {
  enableRecording: true,
  enableTranscription: true,
  enableAiAnalysis: true,
  enableIntegrations: true,
  enableApiAccess: false,
  enableCustomReports: false,
  maxParticipantsPerMeeting: 100,
  maxRecordingDurationMinutes: 180,
  storageLimitGb: 100,
};

const DEFAULT_ADVANCED: AdvancedConfig = {
  customCss: '',
  customJs: '',
  analytics: {
    googleAnalyticsId: null,
    enabled: false,
  },
  support: {
    email: null,
    url: null,
  },
  legal: {
    privacyPolicyUrl: null,
    termsOfServiceUrl: null,
  },
  metaTags: {},
};

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    subject: 'Welcome to {{brandName}}',
    bodyHtml: '<h1>Welcome to {{brandName}}</h1><p>Hello {{userName}},</p><p>Thank you for joining us!</p>',
    variables: ['brandName', 'userName'],
  },
  {
    id: 'meeting-invite',
    name: 'Meeting Invite',
    subject: 'You have been invited to a meeting',
    bodyHtml: '<h1>Meeting Invitation</h1><p>Hello {{userName}},</p><p>You have been invited to {{meetingTitle}}.</p>',
    variables: ['userName', 'meetingTitle', 'meetingUrl', 'meetingTime'],
  },
  {
    id: 'recording-ready',
    name: 'Recording Ready',
    subject: 'Your recording is ready',
    bodyHtml: '<h1>Recording Available</h1><p>Hello {{userName}},</p><p>Your recording for {{meetingTitle}} is now available.</p>',
    variables: ['userName', 'meetingTitle', 'recordingUrl'],
  },
];

export default function WhiteLabelPage() {
  const [configurations, setConfigurations] = useState<WhiteLabelConfig[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ConfigurationStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WhiteLabelConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('branding');
  const [showAssetManager, setShowAssetManager] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewingConfig, setPreviewingConfig] = useState<WhiteLabelConfig | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState<WhiteLabelConfig | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishingConfigId, setPublishingConfigId] = useState<string | null>(null);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [unpublishingConfigId, setUnpublishingConfigId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome');

  const fetchConfigurations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', '10');
      if (searchQuery) params.set('search', searchQuery);
      if (selectedOrganization !== 'all') params.set('organizationId', selectedOrganization);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/admin/white-label?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch configurations');

      const data = await response.json();
      setConfigurations(data.configurations || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, selectedOrganization, statusFilter]);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/organizations?pageSize=100', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, []);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleCreateNew = () => {
    const newConfig: WhiteLabelConfig = {
      id: '',
      organizationId: '',
      organizationName: '',
      status: 'draft',
      branding: { ...DEFAULT_BRANDING },
      domain: { ...DEFAULT_DOMAIN },
      emailTemplates: DEFAULT_EMAIL_TEMPLATES.map((t) => ({ ...t })),
      features: { ...DEFAULT_FEATURES },
      advanced: { ...DEFAULT_ADVANCED },
      assets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
    };
    setEditingConfig(newConfig);
    setActiveTab('branding');
    setShowEditorDialog(true);
  };

  const handleEdit = (config: WhiteLabelConfig) => {
    setEditingConfig({ ...config });
    setActiveTab('branding');
    setAssets(config.assets || []);
    setShowEditorDialog(true);
  };

  const handlePreview = (config: WhiteLabelConfig) => {
    setPreviewingConfig(config);
    setShowPreviewDialog(true);
  };

  const handleSave = async () => {
    if (!editingConfig) return;

    setIsSaving(true);
    try {
      const isNew = !editingConfig.id;
      const url = isNew ? '/api/admin/white-label' : `/api/admin/white-label/${editingConfig.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });

      if (!response.ok) throw new Error('Failed to save configuration');

      setShowEditorDialog(false);
      setEditingConfig(null);
      fetchConfigurations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = (configId: string) => {
    setPublishingConfigId(configId);
    setShowPublishDialog(true);
  };

  const handleUnpublish = (configId: string) => {
    setUnpublishingConfigId(configId);
    setShowUnpublishDialog(true);
  };

  const handleDelete = async (configId: string) => {
    try {
      const response = await fetch(`/api/admin/white-label/${configId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setShowDeleteDialog(false);
      setDeletingConfig(null);
      fetchConfigurations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleAssetUpload = async (configId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/admin/white-label/${configId}/assets`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (response.ok) {
      const asset = await response.json();
      setAssets((prev) => [...prev, asset]);
    }
  };

  const handleAssetDelete = async (configId: string, assetId: string) => {
    const response = await fetch(`/api/admin/white-label/${configId}/assets/${assetId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    }
  };

  const updateBranding = (field: keyof BrandingConfig, value: string | number) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      branding: { ...editingConfig.branding, [field]: value },
    });
  };

  const updateDomain = (field: keyof DomainConfig, value: string | boolean | null) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      domain: { ...editingConfig.domain, [field]: value },
    });
  };

  const updateFeature = (field: keyof FeatureConfig, value: boolean | number) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      features: { ...editingConfig.features, [field]: value },
    });
  };

  const updateAdvanced = (path: string, value: unknown) => {
    if (!editingConfig) return;
    const parts = path.split('.');
    const newAdvanced = { ...editingConfig.advanced };
    let current: Record<string, unknown> = newAdvanced;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = { ...(current[parts[i]] as Record<string, unknown>) };
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
    setEditingConfig({ ...editingConfig, advanced: newAdvanced as AdvancedConfig });
  };

  const updateEmailTemplate = (templateId: string, field: string, value: string) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      emailTemplates: editingConfig.emailTemplates.map((t) =>
        t.id === templateId ? { ...t, [field]: value } : t
      ),
    });
  };

  const getStatusBadge = (status: ConfigurationStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'unpublished':
        return <Badge className="bg-yellow-100 text-yellow-800">Unpublished</Badge>;
      case 'draft':
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getDomainStatusBadge = (status: DomainConfig['verificationStatus']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  const selectedTemplate = editingConfig?.emailTemplates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">White-label Management</h1>
          <p className="text-muted-foreground">
            Manage white-label configurations for organizations
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Configuration
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ConfigurationStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      ) : configurations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Palette className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No configurations found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a new white-label configuration to get started.
          </p>
          <Button onClick={handleCreateNew} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Create Configuration
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Organization</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Brand Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Custom Domain</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Published</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {configurations.map((config) => (
                  <tr key={config.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{config.organizationName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded border"
                          style={{ backgroundColor: config.branding.primaryColor }}
                        />
                        <span className="text-sm font-medium">{config.branding.brandName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(config.status)}</td>
                    <td className="px-4 py-3">
                      {config.domain.customDomain ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{config.domain.customDomain}</span>
                          {getDomainStatusBadge(config.domain.verificationStatus)}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not configured</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {config.publishedAt ? new Date(config.publishedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handlePreview(config)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(config)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(config)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            {config.status !== 'published' ? (
                              <DropdownMenuItem onClick={() => handlePublish(config.id)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Publish
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUnpublish(config.id)}>
                                <X className="mr-2 h-4 w-4" />
                                Unpublish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setDeletingConfig(config);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}{' '}
                configurations
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={showEditorDialog} onClose={() => setShowEditorDialog(false)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingConfig?.id ? 'Edit Configuration' : 'New Configuration'}
            </DialogTitle>
          </DialogHeader>

          {editingConfig && (
            <div className="grid grid-cols-3 gap-6 overflow-hidden">
              <div className="col-span-2 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-4">
                {!editingConfig.id && (
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Select
                      value={editingConfig.organizationId}
                      onValueChange={(v) =>
                        setEditingConfig({
                          ...editingConfig,
                          organizationId: v,
                          organizationName: organizations.find((o) => o.id === v)?.name || '',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="branding">Branding</TabsTrigger>
                    <TabsTrigger value="domain">Domain</TabsTrigger>
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="branding" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Brand Name</Label>
                      <Input
                        value={editingConfig.branding.brandName}
                        onChange={(e) => updateBranding('brandName', e.target.value)}
                        placeholder="Your Brand Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ColorPicker
                        label="Primary Color"
                        value={editingConfig.branding.primaryColor}
                        onChange={(v) => updateBranding('primaryColor', v)}
                      />
                      <ColorPicker
                        label="Secondary Color"
                        value={editingConfig.branding.secondaryColor}
                        onChange={(v) => updateBranding('secondaryColor', v)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ColorPicker
                        label="Accent Color"
                        value={editingConfig.branding.accentColor}
                        onChange={(v) => updateBranding('accentColor', v)}
                      />
                      <ColorPicker
                        label="Background Color"
                        value={editingConfig.branding.backgroundColor}
                        onChange={(v) => updateBranding('backgroundColor', v)}
                      />
                    </div>

                    <ColorPicker
                      label="Text Color"
                      value={editingConfig.branding.textColor}
                      onChange={(v) => updateBranding('textColor', v)}
                    />

                    <ImageUpload
                      label="Logo"
                      value={editingConfig.branding.logoUrl}
                      onChange={(v) => updateBranding('logoUrl', v)}
                      onUpload={async (file) => {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('type', 'logo');
                        const response = await fetch('/api/admin/white-label/upload', {
                          method: 'POST',
                          credentials: 'include',
                          body: formData,
                        });
                        if (response.ok) {
                          const data = await response.json();
                          return data.url;
                        }
                        throw new Error('Upload failed');
                      }}
                    />

                    <ImageUpload
                      label="Favicon"
                      value={editingConfig.branding.faviconUrl}
                      onChange={(v) => updateBranding('faviconUrl', v)}
                      onUpload={async (file) => {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('type', 'favicon');
                        const response = await fetch('/api/admin/white-label/upload', {
                          method: 'POST',
                          credentials: 'include',
                          body: formData,
                        });
                        if (response.ok) {
                          const data = await response.json();
                          return data.url;
                        }
                        throw new Error('Upload failed');
                      }}
                    />

                    <div className="space-y-2">
                      <Label>Font Family</Label>
                      <Select
                        value={editingConfig.branding.fontFamily}
                        onValueChange={(v) => updateBranding('fontFamily', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                          <SelectItem value="Montserrat">Montserrat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Border Radius (px)</Label>
                      <Input
                        type="number"
                        value={editingConfig.branding.borderRadius}
                        onChange={(e) => updateBranding('borderRadius', parseInt(e.target.value) || 0)}
                        min={0}
                        max={24}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="domain" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Custom Domain</Label>
                      <Input
                        value={editingConfig.domain.customDomain || ''}
                        onChange={(e) => updateDomain('customDomain', e.target.value || null)}
                        placeholder="app.yourdomain.com"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the custom domain for your white-label instance
                      </p>
                    </div>

                    {editingConfig.domain.customDomain && (
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Domain Verification</h4>
                            <p className="text-sm text-muted-foreground">
                              Add the following DNS records to verify ownership
                            </p>
                          </div>
                          {getDomainStatusBadge(editingConfig.domain.verificationStatus)}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">CNAME Record</Label>
                          <div className="flex items-center gap-2 rounded bg-muted p-2">
                            <code className="flex-1 text-xs">
                              {editingConfig.domain.customDomain} CNAME app.openmeet.com
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  editingConfig.domain.customDomain + ' CNAME app.openmeet.com'
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">TXT Record (Verification)</Label>
                          <div className="flex items-center gap-2 rounded bg-muted p-2">
                            <code className="flex-1 text-xs">
                              _openmeet-verify.{editingConfig.domain.customDomain} TXT &quot;
                              {editingConfig.domain.verificationToken || 'pending-token'}&quot;
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  '_openmeet-verify.' +
                                    editingConfig.domain.customDomain +
                                    ' TXT "' +
                                    (editingConfig.domain.verificationToken || 'pending-token') +
                                    '"'
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (!editingConfig.id) return;
                            const response = await fetch(
                              '/api/admin/white-label/' + editingConfig.id + '/verify-domain',
                              {
                                method: 'POST',
                                credentials: 'include',
                              }
                            );
                            if (response.ok) {
                              const data = await response.json();
                              updateDomain('verificationStatus', data.status);
                            }
                          }}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Check Verification
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SSL Certificate</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatic SSL certificate provisioning via Let&apos;s Encrypt
                        </p>
                      </div>
                      <Switch
                        checked={editingConfig.domain.sslEnabled}
                        onCheckedChange={(v) => updateDomain('sslEnabled', v)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="email" className="space-y-4 mt-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1 space-y-2">
                        <Label>Templates</Label>
                        <div className="space-y-1">
                          {editingConfig.emailTemplates.map((template) => (
                            <Button
                              key={template.id}
                              variant={selectedTemplateId === template.id ? 'secondary' : 'ghost'}
                              className="w-full justify-start"
                              onClick={() => setSelectedTemplateId(template.id)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              {template.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-3 space-y-4">
                        {selectedTemplate && (
                          <>
                            <div className="space-y-2">
                              <Label>Subject</Label>
                              <Input
                                value={selectedTemplate.subject}
                                onChange={(e) =>
                                  updateEmailTemplate(selectedTemplate.id, 'subject', e.target.value)
                                }
                                placeholder="Email subject"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Body (HTML)</Label>
                              <Textarea
                                value={selectedTemplate.bodyHtml}
                                onChange={(e) =>
                                  updateEmailTemplate(selectedTemplate.id, 'bodyHtml', e.target.value)
                                }
                                placeholder="Email body HTML"
                                rows={10}
                                className="font-mono text-xs"
                              />
                            </div>

                            <div className="rounded-lg border p-4">
                              <h4 className="mb-2 text-sm font-medium">Available Variables</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedTemplate.variables.map((v) => (
                                  <Badge key={v} variant="outline">
                                    {'{{' + v + '}}'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>Recording</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable meeting recording capabilities
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableRecording}
                          onCheckedChange={(v) => updateFeature('enableRecording', v)}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>Transcription</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable automatic meeting transcription
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableTranscription}
                          onCheckedChange={(v) => updateFeature('enableTranscription', v)}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>AI Analysis</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable AI-powered meeting analysis
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableAiAnalysis}
                          onCheckedChange={(v) => updateFeature('enableAiAnalysis', v)}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>Integrations</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable third-party integrations (Zoom, Teams, etc.)
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableIntegrations}
                          onCheckedChange={(v) => updateFeature('enableIntegrations', v)}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>API Access</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable API access for this organization
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableApiAccess}
                          onCheckedChange={(v) => updateFeature('enableApiAccess', v)}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <Label>Custom Reports</Label>
                          <p className="text-xs text-muted-foreground">
                            Enable custom reporting capabilities
                          </p>
                        </div>
                        <Switch
                          checked={editingConfig.features.enableCustomReports}
                          onCheckedChange={(v) => updateFeature('enableCustomReports', v)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Participants per Meeting</Label>
                        <Input
                          type="number"
                          value={editingConfig.features.maxParticipantsPerMeeting}
                          onChange={(e) =>
                            updateFeature('maxParticipantsPerMeeting', parseInt(e.target.value) || 100)
                          }
                          min={1}
                          max={1000}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Max Recording Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={editingConfig.features.maxRecordingDurationMinutes}
                          onChange={(e) =>
                            updateFeature('maxRecordingDurationMinutes', parseInt(e.target.value) || 180)
                          }
                          min={1}
                          max={480}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Storage Limit (GB)</Label>
                        <Input
                          type="number"
                          value={editingConfig.features.storageLimitGb}
                          onChange={(e) =>
                            updateFeature('storageLimitGb', parseInt(e.target.value) || 100)
                          }
                          min={1}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Custom CSS</Label>
                      <Textarea
                        value={editingConfig.advanced.customCss}
                        onChange={(e) => updateAdvanced('customCss', e.target.value)}
                        placeholder="/* Custom CSS overrides */"
                        rows={6}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custom JavaScript</Label>
                      <Textarea
                        value={editingConfig.advanced.customJs}
                        onChange={(e) => updateAdvanced('customJs', e.target.value)}
                        placeholder="// Custom JavaScript"
                        rows={6}
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Warning: Custom JavaScript can affect platform functionality
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Analytics</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable Google Analytics tracking
                        </p>
                      </div>
                      <Switch
                        checked={editingConfig.advanced.analytics.enabled}
                        onCheckedChange={(v) => updateAdvanced('analytics.enabled', v)}
                      />
                    </div>

                    {editingConfig.advanced.analytics.enabled && (
                      <div className="space-y-2">
                        <Label>Google Analytics ID</Label>
                        <Input
                          value={editingConfig.advanced.analytics.googleAnalyticsId || ''}
                          onChange={(e) => updateAdvanced('analytics.googleAnalyticsId', e.target.value || null)}
                          placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={editingConfig.advanced.support.email || ''}
                        onChange={(e) => updateAdvanced('support.email', e.target.value || null)}
                        placeholder="support@yourdomain.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Support URL</Label>
                      <Input
                        type="url"
                        value={editingConfig.advanced.support.url || ''}
                        onChange={(e) => updateAdvanced('support.url', e.target.value || null)}
                        placeholder="https://yourdomain.com/support"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Privacy Policy URL</Label>
                      <Input
                        type="url"
                        value={editingConfig.advanced.legal.privacyPolicyUrl || ''}
                        onChange={(e) => updateAdvanced('legal.privacyPolicyUrl', e.target.value || null)}
                        placeholder="https://yourdomain.com/privacy"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Terms of Service URL</Label>
                      <Input
                        type="url"
                        value={editingConfig.advanced.legal.termsOfServiceUrl || ''}
                        onChange={(e) => updateAdvanced('legal.termsOfServiceUrl', e.target.value || null)}
                        placeholder="https://yourdomain.com/terms"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custom Meta Tags</Label>
                      <div className="space-y-2">
                        {Object.entries(editingConfig.advanced.metaTags || {}).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <Input value={key} disabled className="w-32" />
                            <Input
                              value={value}
                              onChange={(e) => {
                                const newTags = { ...editingConfig.advanced.metaTags, [key]: e.target.value };
                                updateAdvanced('metaTags', newTags);
                              }}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newTags = { ...editingConfig.advanced.metaTags };
                                delete newTags[key];
                                updateAdvanced('metaTags', newTags);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const key = 'meta_' + new Date().getTime();
                            updateAdvanced('metaTags', { ...editingConfig.advanced.metaTags, [key]: '' });
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Meta Tag
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="border-l pl-6">
                <h3 className="mb-4 text-sm font-medium">Live Preview</h3>
                <LivePreview config={editingConfig} />
              </div>
            </div>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setShowAssetManager(true)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Asset Manager
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditorDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssetManager} onClose={() => setShowAssetManager(false)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Asset Manager</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                id="asset-upload"
                className="hidden"
                accept="image/*,.svg,.ico"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && editingConfig?.id) {
                    await handleAssetUpload(editingConfig.id, file);
                  }
                }}
              />
              <Button
                onClick={() => document.getElementById('asset-upload')?.click()}
                disabled={!editingConfig?.id}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Asset
              </Button>
              <p className="text-sm text-muted-foreground">
                Supported formats: PNG, JPG, SVG, ICO (max 5MB)
              </p>
            </div>

            {assets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No assets uploaded</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload images and icons for your white-label configuration
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="group relative rounded-lg border p-2">
                    <div className="aspect-square overflow-hidden rounded bg-muted">
                      <img src={asset.url} alt={asset.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="mt-2">
                      <p className="truncate text-sm font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigator.clipboard.writeText(asset.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (editingConfig?.id) {
                            handleAssetDelete(editingConfig.id, asset.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setShowAssetManager(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onClose={() => setShowPreviewDialog(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview: {previewingConfig?.branding.brandName}</DialogTitle>
          </DialogHeader>

          {previewingConfig && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span>Organization: {previewingConfig.organizationName}</span>
                {getStatusBadge(previewingConfig.status)}
              </div>

              <div className="overflow-hidden rounded-lg border">
                <LivePreview config={previewingConfig} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-medium">Branding</h4>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: previewingConfig.branding.primaryColor }}
                    />
                    <span className="text-sm">Primary</span>
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: previewingConfig.branding.secondaryColor }}
                    />
                    <span className="text-sm">Secondary</span>
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: previewingConfig.branding.accentColor }}
                    />
                    <span className="text-sm">Accent</span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                  <h4 className="font-medium">Domain</h4>
                  {previewingConfig.domain.customDomain ? (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">{previewingConfig.domain.customDomain}</span>
                      {getDomainStatusBadge(previewingConfig.domain.verificationStatus)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (previewingConfig) {
                  handleEdit(previewingConfig);
                  setShowPreviewDialog(false);
                }
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Configuration
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
              {previewingConfig && previewingConfig.status !== 'published' && (
                <Button
                  onClick={() => {
                    handlePublish(previewingConfig.id);
                    setShowPreviewDialog(false);
                  }}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the configuration for{' '}
              <strong>{deletingConfig?.organizationName}</strong>? This action cannot be undone and
              will remove all branding settings, custom domains, and uploaded assets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deletingConfig) {
                  handleDelete(deletingConfig.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPublishDialog} onClose={() => setShowPublishDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Publishing this configuration will make the white-label branding live. Users will
              immediately see the new branding, colors, and customizations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPublishingConfigId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (publishingConfigId) {
                  const response = await fetch(
                    '/api/admin/white-label/' + publishingConfigId + '/publish',
                    {
                      method: 'POST',
                      credentials: 'include',
                    }
                  );
                  if (response.ok) {
                    fetchConfigurations();
                  }
                  setShowPublishDialog(false);
                  setPublishingConfigId(null);
                }
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Publish Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnpublishDialog} onClose={() => setShowUnpublishDialog(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Unpublishing this configuration will revert the organization to default branding.
              Users will no longer see the custom white-label experience.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnpublishingConfigId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-600 hover:bg-yellow-700"
              onClick={async () => {
                if (unpublishingConfigId) {
                  const response = await fetch(
                    '/api/admin/white-label/' + unpublishingConfigId + '/unpublish',
                    {
                      method: 'POST',
                      credentials: 'include',
                    }
                  );
                  if (response.ok) {
                    fetchConfigurations();
                  }
                  setShowUnpublishDialog(false);
                  setUnpublishingConfigId(null);
                }
              }}
            >
              Unpublish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
