'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import { ColorPicker } from '@/components/branding/ColorPicker';
import { LogoUploader } from '@/components/branding/LogoUploader';
import { BrandPreview } from '@/components/branding/BrandPreview';
import { ThemeEditor } from '@/components/branding/ThemeEditor';
import { EmailBrandingEditor } from '@/components/branding/EmailBrandingEditor';
import { CustomDomainSetup } from '@/components/branding/CustomDomainSetup';
import { BrandAssetLibrary } from '@/components/branding/BrandAssetLibrary';
import { BrandingConfig } from '@/hooks/useBranding';
import { Save, RotateCcw, Globe, CheckCircle, AlertCircle, Palette, Mail, Image as ImageIcon, Settings } from 'lucide-react';

type TabType = 'general' | 'theme' | 'email' | 'domain' | 'assets';

export default function BrandingPage() {
  const { branding, updateBranding, loading: themeLoading } = useTheme();
  const [formData, setFormData] = useState<Partial<BrandingConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  useEffect(() => {
    setFormData(branding);
    setCustomDomain(branding.customDomain || '');
  }, [branding]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await updateBranding(formData);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset to default branding?')) {
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const response = await fetch('/api/whitelabel/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset branding');
      }

      const config = await response.json();
      setFormData(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to reset branding');
    } finally {
      setSaving(false);
    }
  };

  const handleConfigureDomain = async () => {
    if (!customDomain) {
      setSaveError('Please enter a custom domain');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const response = await fetch('/api/whitelabel/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customDomain }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to configure domain');
      }

      const result = await response.json();

      alert(
        `Domain configured! Please add these DNS records:\n\n${result.dnsRecords
          .map((r: any) => `${r.type}: ${r.name} -> ${r.value}`)
          .join('\n')}`
      );

      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to configure domain');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async (): Promise<boolean> => {
    try {
      setVerifying(true);
      setSaveError(null);

      const response = await fetch('/api/whitelabel/domain/verify', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to verify domain');
      }

      const result = await response.json();

      if (result.verified) {
        alert('Domain verified successfully!');
        setSaveSuccess(true);
        return true;
      } else {
        setSaveError('Domain verification failed. Please check your DNS records.');
        return false;
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to verify domain');
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const updateFormData = (key: keyof BrandingConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const previewConfig: BrandingConfig = {
    ...branding,
    ...formData,
  } as BrandingConfig;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">White-Label Branding</h1>
          <p className="text-gray-600 mt-1">
            Customize the look and feel of your platform
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving || themeLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving || themeLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success/Error messages */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="w-5 h-5" />
          Branding saved successfully!
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="w-5 h-5" />
          {saveError}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'theme'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            Theme Editor
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Branding
          </button>
          <button
            onClick={() => setActiveTab('domain')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'domain'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            Custom Domain
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'assets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Asset Library
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Colors */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Brand Colors</h2>

            <ColorPicker
              label="Primary Color"
              value={formData.primaryColor || branding.primaryColor}
              onChange={(color) => updateFormData('primaryColor', color)}
              showPresets
              showContrast
              contrastWith={formData.backgroundColor || branding.backgroundColor}
              description="Main brand color used for buttons and highlights"
            />

            <ColorPicker
              label="Secondary Color"
              value={formData.secondaryColor || branding.secondaryColor}
              onChange={(color) => updateFormData('secondaryColor', color)}
              showPresets
              description="Secondary accent color"
            />

            <ColorPicker
              label="Accent Color"
              value={formData.accentColor || branding.accentColor}
              onChange={(color) => updateFormData('accentColor', color)}
              showPresets
              description="Additional accent color for variety"
            />

            <ColorPicker
              label="Background Color"
              value={formData.backgroundColor || branding.backgroundColor}
              onChange={(color) => updateFormData('backgroundColor', color)}
              description="Main background color"
            />

            <ColorPicker
              label="Text Color"
              value={formData.textColor || branding.textColor}
              onChange={(color) => updateFormData('textColor', color)}
              showContrast
              contrastWith={formData.backgroundColor || branding.backgroundColor}
              description="Primary text color"
            />
          </div>

          {/* Logos */}
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Logos & Assets</h2>

            <LogoUploader
              label="Main Logo"
              value={formData.logoUrl || branding.logoUrl}
              onChange={(url) => updateFormData('logoUrl', url)}
              onRemove={() => updateFormData('logoUrl', undefined)}
              logoType="logo"
              description="Primary logo for light backgrounds"
            />

            <LogoUploader
              label="Dark Mode Logo"
              value={formData.logoDarkUrl || branding.logoDarkUrl}
              onChange={(url) => updateFormData('logoDarkUrl', url)}
              onRemove={() => updateFormData('logoDarkUrl', undefined)}
              logoType="logoDark"
              description="Logo for dark mode (optional)"
            />

            <LogoUploader
              label="Square Logo"
              value={formData.logoSquareUrl || branding.logoSquareUrl}
              onChange={(url) => updateFormData('logoSquareUrl', url)}
              onRemove={() => updateFormData('logoSquareUrl', undefined)}
              logoType="logoSquare"
              description="Square version for icons and avatars"
            />

            <LogoUploader
              label="Favicon"
              value={formData.faviconUrl || branding.faviconUrl}
              onChange={(url) => updateFormData('faviconUrl', url)}
              onRemove={() => updateFormData('faviconUrl', undefined)}
              logoType="favicon"
              description="Browser tab icon (16x16 or 32x32)"
            />
          </div>

          {/* Product Information */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Product Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name
              </label>
              <input
                type="text"
                value={formData.productName || branding.productName}
                onChange={(e) => updateFormData('productName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="OpenMeet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={formData.companyName || branding.companyName || ''}
                onChange={(e) => updateFormData('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="Your Company Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagline
              </label>
              <input
                type="text"
                value={formData.tagline || branding.tagline || ''}
                onChange={(e) => updateFormData('tagline', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="AI-powered meeting assistant"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hideWatermark"
                checked={formData.hideWatermark ?? branding.hideWatermark}
                onChange={(e) => updateFormData('hideWatermark', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hideWatermark" className="text-sm text-gray-700">
                Hide "Powered by" watermark
              </label>
            </div>
          </div>

          {/* Custom Domain */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Custom Domain</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="meetings.yourcompany.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter your custom domain (e.g., meetings.yourcompany.com)
              </p>
            </div>

            {branding.customDomain && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-600">Current domain:</span>
                <span className="text-sm font-medium">{branding.customDomain}</span>
                {branding.customDomainVerified ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleConfigureDomain}
                disabled={saving || !customDomain}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Configure DNS
              </button>
              {branding.customDomain && !branding.customDomainVerified && (
                <button
                  onClick={handleVerifyDomain}
                  disabled={verifying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {verifying ? 'Verifying...' : 'Verify Domain'}
                </button>
              )}
            </div>
          </div>

          {/* Email Branding */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Email Branding</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={formData.emailFromName || branding.emailFromName}
                onChange={(e) => updateFormData('emailFromName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="OpenMeet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email
              </label>
              <input
                type="email"
                value={formData.emailFromEmail || branding.emailFromEmail || ''}
                onChange={(e) => updateFormData('emailFromEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="noreply@yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Footer
              </label>
              <textarea
                value={formData.emailFooter || branding.emailFooter || ''}
                onChange={(e) => updateFormData('emailFooter', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                placeholder="© 2025 Your Company. All rights reserved."
              />
            </div>
          </div>

          {/* Advanced */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Advanced</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom CSS
              </label>
              <textarea
                value={formData.customCSS || branding.customCSS || ''}
                onChange={(e) => updateFormData('customCSS', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs focus:border-blue-500 focus:ring-blue-500"
                placeholder=".custom-class { color: red; }"
              />
              <p className="mt-1 text-xs text-gray-500">
                Add custom CSS to further customize the appearance
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Live Preview</h2>
            <BrandPreview config={previewConfig} />
          </div>
        </div>
      </div>
      )}

      {activeTab === 'theme' && (
        <ThemeEditor
          config={formData as BrandingConfig}
          onUpdate={(updates) => {
            setFormData(prev => ({ ...prev, ...updates }));
          }}
          presets={[
            {
              id: 'modern',
              name: 'Modern',
              description: 'Clean and contemporary design',
              colors: {
                primaryColor: '#3B82F6',
                secondaryColor: '#8B5CF6',
                accentColor: '#EC4899',
                backgroundColor: '#FFFFFF',
                textColor: '#1F2937',
              },
              preview: 'modern-preview.jpg'
            },
            {
              id: 'dark',
              name: 'Dark Mode',
              description: 'Elegant dark theme',
              colors: {
                primaryColor: '#60A5FA',
                secondaryColor: '#A78BFA',
                accentColor: '#F472B6',
                backgroundColor: '#111827',
                textColor: '#F9FAFB',
              },
              preview: 'dark-preview.jpg'
            },
            {
              id: 'corporate',
              name: 'Corporate',
              description: 'Professional business theme',
              colors: {
                primaryColor: '#0F172A',
                secondaryColor: '#475569',
                accentColor: '#0EA5E9',
                backgroundColor: '#FFFFFF',
                textColor: '#334155',
              },
              preview: 'corporate-preview.jpg'
            }
          ]}
          onApplyPreset={(presetId) => {
            // Apply preset logic
            console.log('Applying preset:', presetId);
          }}
        />
      )}

      {activeTab === 'email' && (
        <EmailBrandingEditor
          config={formData as BrandingConfig}
          onUpdate={(updates) => {
            setFormData(prev => ({ ...prev, ...updates }));
          }}
          onSave={handleSave}
        />
      )}

      {activeTab === 'domain' && (
        <CustomDomainSetup
          config={formData as BrandingConfig}
          onConfigureDomain={handleConfigureDomain}
          onVerifyDomain={handleVerifyDomain}
          onUpdate={(updates) => {
            setFormData(prev => ({ ...prev, ...updates }));
          }}
        />
      )}

      {activeTab === 'assets' && (
        <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
          <BrandAssetLibrary
            config={formData as BrandingConfig}
            onUpload={async (files) => {
              // Handle file upload
              console.log('Uploading files:', files);
              // Mock implementation - return mock assets
              return files.map((file, index) => ({
                id: `asset-${Date.now()}-${index}`,
                name: file.name,
                type: file.type.startsWith('image/') ? 'image' as const : 'document' as const,
                category: 'general' as const,
                url: URL.createObjectURL(file),
                size: file.size,
                mimeType: file.type,
                uploadedAt: new Date(),
                uploadedBy: 'current-user@company.com',
                tags: [],
                isPublic: true,
                usageCount: 0,
                approved: false,
                version: 1
              }));
            }}
            onDelete={async (assetId) => {
              console.log('Deleting asset:', assetId);
            }}
            onUpdate={async (assetId, updates) => {
              console.log('Updating asset:', assetId, updates);
            }}
            onDownload={(asset) => {
              console.log('Downloading asset:', asset);
              // Trigger download
              const a = document.createElement('a');
              a.href = asset.url;
              a.download = asset.name;
              a.click();
            }}
            onApplyAsset={(asset, target) => {
              console.log('Applying asset:', asset, 'to', target);
              // Apply asset as logo/favicon/etc
              if (target === 'logo' && asset.type === 'image') {
                updateFormData('logoUrl', asset.url);
              }
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
