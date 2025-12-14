import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface BrandingConfig {
  // Color Theme
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  errorColor: string;
  warningColor: string;
  successColor: string;
  infoColor: string;

  // Dark Mode Colors
  darkPrimaryColor?: string;
  darkSecondaryColor?: string;
  darkAccentColor?: string;
  darkBackgroundColor?: string;
  darkTextColor?: string;

  // Logo & Assets
  logoUrl?: string;
  logoDarkUrl?: string;
  logoSquareUrl?: string;
  faviconUrl?: string;
  emailHeaderUrl?: string;
  socialShareImageUrl?: string;

  // Product Information
  productName: string;
  companyName?: string;
  tagline?: string;
  description?: string;

  // Email Branding
  emailFromName: string;
  emailFromEmail?: string;
  emailReplyTo?: string;
  emailFooter?: string;
  emailSignature?: string;
  emailTemplateStyle?: 'modern' | 'classic' | 'minimal';

  // Custom Domain
  customDomain?: string;
  customDomainVerified?: boolean;
  customDomainDNS?: Array<{
    type: string;
    name: string;
    value: string;
    priority?: number;
  }>;

  // Advanced
  customCSS?: string;
  customFonts?: {
    heading?: string;
    body?: string;
  };
  hideWatermark?: boolean;
  customScripts?: string;

  // Social Links
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };

  // Support
  supportEmail?: string;
  supportPhone?: string;
  supportUrl?: string;
  documentationUrl?: string;
}

interface BrandAsset {
  id: string;
  type: 'logo' | 'icon' | 'banner' | 'background' | 'other';
  name: string;
  url: string;
  uploadedAt: Date;
  fileSize: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface ThemePreset {
  id: string;
  name: string;
  description?: string;
  colors: Partial<BrandingConfig>;
  preview?: string;
}

export function useBranding() {
  const [config, setConfig] = useState<BrandingConfig>({
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    errorColor: '#EF4444',
    warningColor: '#F59E0B',
    successColor: '#10B981',
    infoColor: '#3B82F6',
    productName: 'OpenMeet',
    emailFromName: 'OpenMeet',
  });

  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presets] = useState<ThemePreset[]>([
    {
      id: 'modern-blue',
      name: 'Modern Blue',
      description: 'Clean and professional blue theme',
      colors: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        accentColor: '#8B5CF6',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
      },
    },
    {
      id: 'dark-purple',
      name: 'Dark Purple',
      description: 'Sophisticated dark theme with purple accents',
      colors: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#EC4899',
        accentColor: '#14B8A6',
        backgroundColor: '#0F172A',
        textColor: '#F1F5F9',
      },
    },
    {
      id: 'emerald-green',
      name: 'Emerald Green',
      description: 'Fresh and vibrant green theme',
      colors: {
        primaryColor: '#10B981',
        secondaryColor: '#14B8A6',
        accentColor: '#06B6D4',
        backgroundColor: '#FFFFFF',
        textColor: '#064E3B',
      },
    },
    {
      id: 'sunset-orange',
      name: 'Sunset Orange',
      description: 'Warm and energetic orange theme',
      colors: {
        primaryColor: '#F97316',
        secondaryColor: '#FB923C',
        accentColor: '#FBBF24',
        backgroundColor: '#FFF7ED',
        textColor: '#7C2D12',
      },
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      description: 'Classic black and white theme',
      colors: {
        primaryColor: '#000000',
        secondaryColor: '#6B7280',
        accentColor: '#374151',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
      },
    },
  ]);

  // Load branding configuration
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whitelabel/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load branding config:', error);
      toast.error('Failed to load branding configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save branding configuration
  const saveConfig = useCallback(async (newConfig: Partial<BrandingConfig>) => {
    try {
      setSaving(true);
      const response = await fetch('/api/whitelabel/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        toast.success('Branding configuration saved');
        return data;
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save branding config:', error);
      toast.error('Failed to save branding configuration');
      throw error;
    } finally {
      setSaving(false);
    }
  }, []);

  // Update specific branding field
  const updateField = useCallback(async (field: keyof BrandingConfig, value: any) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
  }, [config]);

  // Apply theme preset
  const applyPreset = useCallback(async (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const newConfig = { ...config, ...preset.colors };
      await saveConfig(newConfig);
    }
  }, [config, presets, saveConfig]);

  // Upload asset
  const uploadAsset = useCallback(async (file: File, type: BrandAsset['type']) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/whitelabel/assets', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const asset = await response.json();
        setAssets(prev => [...prev, asset]);
        toast.success('Asset uploaded successfully');
        return asset;
      } else {
        throw new Error('Failed to upload asset');
      }
    } catch (error) {
      console.error('Failed to upload asset:', error);
      toast.error('Failed to upload asset');
      throw error;
    }
  }, []);

  // Delete asset
  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(`/api/whitelabel/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAssets(prev => prev.filter(a => a.id !== assetId));
        toast.success('Asset deleted successfully');
      } else {
        throw new Error('Failed to delete asset');
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      toast.error('Failed to delete asset');
      throw error;
    }
  }, []);

  // Load assets
  const loadAssets = useCallback(async () => {
    try {
      const response = await fetch('/api/whitelabel/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  }, []);

  // Configure custom domain
  const configureDomain = useCallback(async (domain: string) => {
    try {
      const response = await fetch('/api/whitelabel/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: domain }),
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(prev => ({
          ...prev,
          customDomain: domain,
          customDomainDNS: result.dnsRecords,
        }));
        toast.success('Domain configured successfully');
        return result;
      } else {
        throw new Error('Failed to configure domain');
      }
    } catch (error) {
      console.error('Failed to configure domain:', error);
      toast.error('Failed to configure domain');
      throw error;
    }
  }, []);

  // Verify custom domain
  const verifyDomain = useCallback(async () => {
    try {
      const response = await fetch('/api/whitelabel/domain/verify', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(prev => ({
          ...prev,
          customDomainVerified: result.verified,
        }));

        if (result.verified) {
          toast.success('Domain verified successfully');
        } else {
          toast.warning('Domain verification failed. Please check DNS records.');
        }

        return result.verified;
      } else {
        throw new Error('Failed to verify domain');
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
      toast.error('Failed to verify domain');
      throw error;
    }
  }, []);

  // Generate CSS variables
  const getCSSVariables = useCallback(() => {
    const vars: Record<string, string> = {
      '--brand-primary': config.primaryColor,
      '--brand-secondary': config.secondaryColor,
      '--brand-accent': config.accentColor,
      '--brand-background': config.backgroundColor,
      '--brand-text': config.textColor,
      '--brand-error': config.errorColor,
      '--brand-warning': config.warningColor,
      '--brand-success': config.successColor,
      '--brand-info': config.infoColor,
    };

    if (config.darkPrimaryColor) {
      vars['--brand-dark-primary'] = config.darkPrimaryColor;
      vars['--brand-dark-secondary'] = config.darkSecondaryColor || config.secondaryColor;
      vars['--brand-dark-accent'] = config.darkAccentColor || config.accentColor;
      vars['--brand-dark-background'] = config.darkBackgroundColor || '#0F172A';
      vars['--brand-dark-text'] = config.darkTextColor || '#F1F5F9';
    }

    return vars;
  }, [config]);

  // Calculate color contrast
  const calculateContrast = useCallback((color1: string, color2: string) => {
    // Simple contrast calculation
    const getLuminance = (color: string) => {
      const rgb = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (!rgb) return 0;

      const [r, g, b] = [
        parseInt(rgb[1], 16) / 255,
        parseInt(rgb[2], 16) / 255,
        parseInt(rgb[3], 16) / 255,
      ].map(val => {
        if (val <= 0.03928) return val / 12.92;
        return Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await fetch('/api/whitelabel/reset', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        toast.success('Reset to default branding');
        return data;
      } else {
        throw new Error('Failed to reset');
      }
    } catch (error) {
      console.error('Failed to reset branding:', error);
      toast.error('Failed to reset to defaults');
      throw error;
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadConfig();
    loadAssets();
  }, [loadConfig, loadAssets]);

  return {
    config,
    assets,
    loading,
    saving,
    presets,
    saveConfig,
    updateField,
    applyPreset,
    uploadAsset,
    deleteAsset,
    configureDomain,
    verifyDomain,
    getCSSVariables,
    calculateContrast,
    resetToDefaults,
  };
}