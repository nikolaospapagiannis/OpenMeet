'use client';

import React, { useState } from 'react';
import { Shield, Upload, AlertTriangle, CheckCircle, Loader, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface SAMLConfiguration {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  provider: 'okta' | 'azure_ad' | 'auth0' | 'onelogin' | 'google' | 'custom';
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups?: string;
    role?: string;
  };
  enforceSSO: boolean;
  jitProvisioning: boolean;
  allowedDomains: string[];
}

interface SAMLConfigFormProps {
  config?: SAMLConfiguration;
  onSave: (config: SAMLConfiguration) => Promise<void>;
  onTest?: () => Promise<boolean>;
}

export const SAMLConfigForm: React.FC<SAMLConfigFormProps> = ({
  config,
  onSave,
  onTest
}) => {
  const [formData, setFormData] = useState<SAMLConfiguration>({
    entityId: config?.entityId || '',
    ssoUrl: config?.ssoUrl || '',
    sloUrl: config?.sloUrl || '',
    certificate: config?.certificate || '',
    provider: config?.provider || 'custom',
    attributeMapping: config?.attributeMapping || {
      email: 'email',
      firstName: 'firstName',
      lastName: 'lastName',
      groups: 'groups',
      role: 'role'
    },
    enforceSSO: config?.enforceSSO || false,
    jitProvisioning: config?.jitProvisioning || true,
    allowedDomains: config?.allowedDomains || []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [certificateError, setCertificateError] = useState('');

  const providerPresets = {
    okta: {
      entityId: 'http://www.okta.com/{appId}',
      ssoUrl: 'https://{yourDomain}.okta.com/app/{appName}/{appId}/sso/saml',
      attributeMapping: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName',
        groups: 'groups'
      }
    },
    azure_ad: {
      entityId: 'https://sts.windows.net/{tenantId}/',
      ssoUrl: 'https://login.microsoftonline.com/{tenantId}/saml2',
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
        groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'
      }
    },
    auth0: {
      entityId: 'urn:auth0:{domain}:{clientId}',
      ssoUrl: 'https://{domain}/samlp/{clientId}',
      attributeMapping: {
        email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
        firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
        lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'
      }
    },
    google: {
      entityId: 'google.com',
      ssoUrl: 'https://accounts.google.com/o/saml2/idp?idpid={idpId}',
      attributeMapping: {
        email: 'email',
        firstName: 'firstName',
        lastName: 'lastName'
      }
    }
  };

  const handleProviderChange = (provider: SAMLConfiguration['provider']) => {
    if (provider !== 'custom' && providerPresets[provider]) {
      const preset = providerPresets[provider];
      setFormData(prev => ({
        ...prev,
        provider,
        attributeMapping: preset.attributeMapping as any
      }));
    } else {
      setFormData(prev => ({ ...prev, provider }));
    }
  };

  const validateCertificate = (cert: string): boolean => {
    const certRegex = /^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/;
    return certRegex.test(cert.trim());
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (validateCertificate(content)) {
          setFormData(prev => ({ ...prev, certificate: content }));
          setCertificateError('');
        } else {
          setCertificateError('Invalid certificate format. Please upload a valid X.509 certificate.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save SAML configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!onTest) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await onTest();
      setTestResult({
        success,
        message: success
          ? 'Connection successful! SAML configuration is working correctly.'
          : 'Connection failed. Please verify your configuration.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Test failed: ' + (error as Error).message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const acsUrl = `${window.location.origin}/api/sso/saml/acs/${(window as any).organizationId || 'org-id'}`;
  const metadataUrl = `${window.location.origin}/api/sso/saml/metadata/${(window as any).organizationId || 'org-id'}`;
  const entityIdValue = `${window.location.origin}/saml`;

  return (
    <div className="space-y-6">
      <CardGlass variant="default" hover>
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-teal-400" />
          <h2 className="text-xl font-semibold text-white">SAML 2.0 Configuration</h2>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Identity Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value as SAMLConfiguration['provider'])}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
            >
              <option value="okta">Okta</option>
              <option value="azure_ad">Azure AD</option>
              <option value="auth0">Auth0</option>
              <option value="onelogin">OneLogin</option>
              <option value="google">Google Workspace</option>
              <option value="custom">Custom SAML 2.0</option>
            </select>
          </div>

          {/* Entity ID */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Entity ID / Issuer
            </label>
            <input
              type="text"
              value={formData.entityId}
              onChange={(e) => setFormData(prev => ({ ...prev, entityId: e.target.value }))}
              placeholder="https://idp.example.com/metadata"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">
              The unique identifier for your identity provider
            </p>
          </div>

          {/* SSO URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SSO URL (Sign-In URL)
            </label>
            <input
              type="url"
              value={formData.ssoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, ssoUrl: e.target.value }))}
              placeholder="https://idp.example.com/sso/saml"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
            />
          </div>

          {/* SLO URL (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              SLO URL (Sign-Out URL) <Badge variant="outline" className="ml-2">Optional</Badge>
            </label>
            <input
              type="url"
              value={formData.sloUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, sloUrl: e.target.value }))}
              placeholder="https://idp.example.com/slo/saml"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
            />
          </div>

          {/* Certificate */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              X.509 Certificate
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => document.getElementById('cert-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Certificate
                </Button>
                <input
                  id="cert-upload"
                  type="file"
                  accept=".pem,.crt,.cer"
                  onChange={handleCertificateUpload}
                  className="hidden"
                />
                {formData.certificate && (
                  <Badge variant="success">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Certificate uploaded
                  </Badge>
                )}
              </div>
              <textarea
                value={formData.certificate}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, certificate: value }));
                  if (value && !validateCertificate(value)) {
                    setCertificateError('Invalid certificate format');
                  } else {
                    setCertificateError('');
                  }
                }}
                className="w-full h-32 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all font-mono text-xs"
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              />
              {certificateError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {certificateError}
                </p>
              )}
            </div>
          </div>

          {/* Service Provider Endpoints */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <h3 className="font-medium text-slate-200 mb-4">Service Provider Configuration</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure these values in your Identity Provider
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">SP Entity ID:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-teal-300 text-xs">
                    {entityIdValue}
                  </code>
                  <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(entityIdValue)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">ACS URL (Reply URL):</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-teal-300 text-xs">
                    {acsUrl}
                  </code>
                  <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(acsUrl)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">Metadata URL:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-teal-300 text-xs">
                    {metadataUrl}
                  </code>
                  <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(metadataUrl)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Allowed Domains */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Allowed Domains
            </label>
            <input
              type="text"
              value={formData.allowedDomains.join(', ')}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                allowedDomains: e.target.value.split(',').map(d => d.trim()).filter(Boolean)
              }))}
              placeholder="example.com, company.org"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">
              Comma-separated list of email domains allowed for SSO
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-xl border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="gradient-primary"
              size="default"
              onClick={handleSave}
              disabled={isSaving || !formData.entityId || !formData.ssoUrl || !formData.certificate}
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
            <Button
              variant="ghost-glass"
              size="default"
              onClick={handleTest}
              disabled={isTesting || !formData.entityId || !formData.ssoUrl || !formData.certificate}
            >
              {isTesting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
          </div>
        </div>
      </CardGlass>
    </div>
  );
};