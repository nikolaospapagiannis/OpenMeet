'use client';

import React, { useState, useEffect } from 'react';
import { Key, Globe, AlertTriangle, CheckCircle, Loader, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';

interface OIDCConfiguration {
  provider: 'okta' | 'auth0' | 'azure_ad' | 'google' | 'custom';
  clientId: string;
  clientSecret: string;
  discoveryUrl?: string;
  issuer?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  jwksUrl?: string;
  scopes: string[];
  responseType: 'code' | 'id_token' | 'token';
  responseMode: 'query' | 'fragment' | 'form_post';
  prompt: 'none' | 'login' | 'consent' | 'select_account';
  display: 'page' | 'popup' | 'touch' | 'wap';
  attributeMapping: {
    sub: string;
    email: string;
    name: string;
    given_name: string;
    family_name: string;
    picture?: string;
    groups?: string;
    roles?: string;
  };
  enforceSSO: boolean;
  allowedDomains: string[];
}

interface OIDCConfigFormProps {
  config?: OIDCConfiguration;
  onSave: (config: OIDCConfiguration) => Promise<void>;
  onTest?: () => Promise<boolean>;
  onDiscover?: (discoveryUrl: string) => Promise<Partial<OIDCConfiguration>>;
}

export const OIDCConfigForm: React.FC<OIDCConfigFormProps> = ({
  config,
  onSave,
  onTest,
  onDiscover
}) => {
  const [formData, setFormData] = useState<OIDCConfiguration>({
    provider: config?.provider || 'custom',
    clientId: config?.clientId || '',
    clientSecret: config?.clientSecret || '',
    discoveryUrl: config?.discoveryUrl || '',
    issuer: config?.issuer || '',
    authorizationUrl: config?.authorizationUrl || '',
    tokenUrl: config?.tokenUrl || '',
    userInfoUrl: config?.userInfoUrl || '',
    jwksUrl: config?.jwksUrl || '',
    scopes: config?.scopes || ['openid', 'profile', 'email'],
    responseType: config?.responseType || 'code',
    responseMode: config?.responseMode || 'query',
    prompt: config?.prompt || 'select_account',
    display: config?.display || 'page',
    attributeMapping: config?.attributeMapping || {
      sub: 'sub',
      email: 'email',
      name: 'name',
      given_name: 'given_name',
      family_name: 'family_name',
      picture: 'picture',
      groups: 'groups',
      roles: 'roles'
    },
    enforceSSO: config?.enforceSSO || false,
    allowedDomains: config?.allowedDomains || []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const providerPresets = {
    okta: {
      discoveryUrl: 'https://{yourDomain}.okta.com/.well-known/openid-configuration',
      scopes: ['openid', 'profile', 'email', 'groups'],
      attributeMapping: {
        sub: 'sub',
        email: 'email',
        name: 'name',
        given_name: 'given_name',
        family_name: 'family_name',
        groups: 'groups'
      }
    },
    auth0: {
      discoveryUrl: 'https://{yourDomain}.auth0.com/.well-known/openid-configuration',
      scopes: ['openid', 'profile', 'email'],
      attributeMapping: {
        sub: 'sub',
        email: 'email',
        name: 'name',
        given_name: 'given_name',
        family_name: 'family_name',
        picture: 'picture'
      }
    },
    azure_ad: {
      discoveryUrl: 'https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      attributeMapping: {
        sub: 'sub',
        email: 'email',
        name: 'name',
        given_name: 'given_name',
        family_name: 'family_name',
        groups: 'groups'
      }
    },
    google: {
      discoveryUrl: 'https://accounts.google.com/.well-known/openid-configuration',
      scopes: ['openid', 'profile', 'email'],
      attributeMapping: {
        sub: 'sub',
        email: 'email',
        name: 'name',
        given_name: 'given_name',
        family_name: 'family_name',
        picture: 'picture'
      }
    }
  };

  const handleProviderChange = (provider: OIDCConfiguration['provider']) => {
    if (provider !== 'custom' && providerPresets[provider]) {
      const preset = providerPresets[provider];
      setFormData(prev => ({
        ...prev,
        provider,
        ...preset
      }));
    } else {
      setFormData(prev => ({ ...prev, provider }));
    }
  };

  const handleDiscovery = async () => {
    if (!onDiscover || !formData.discoveryUrl) return;

    setIsDiscovering(true);
    setDiscoveryResult(null);
    try {
      const discovered = await onDiscover(formData.discoveryUrl);
      setFormData(prev => ({
        ...prev,
        ...discovered
      }));
      setDiscoveryResult({
        success: true,
        message: 'Successfully discovered OIDC configuration endpoints'
      });
    } catch (error) {
      setDiscoveryResult({
        success: false,
        message: 'Failed to discover configuration: ' + (error as Error).message
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Failed to save OIDC configuration:', error);
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
          ? 'Connection successful! OIDC configuration is working correctly.'
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

  const redirectUrl = `${window.location.origin}/api/auth/callback/oidc`;
  const postLogoutRedirectUrl = `${window.location.origin}/login`;

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }));
  };

  const addCustomScope = (scope: string) => {
    if (scope && !formData.scopes.includes(scope)) {
      setFormData(prev => ({
        ...prev,
        scopes: [...prev.scopes, scope]
      }));
    }
  };

  return (
    <div className="space-y-6">
      <CardGlass variant="default" hover>
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">OpenID Connect (OIDC) Configuration</h2>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Identity Provider
            </label>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value as OIDCConfiguration['provider'])}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
            >
              <option value="okta">Okta</option>
              <option value="auth0">Auth0</option>
              <option value="azure_ad">Azure AD / Microsoft Entra ID</option>
              <option value="google">Google Workspace</option>
              <option value="custom">Custom OIDC Provider</option>
            </select>
          </div>

          {/* Discovery URL with Auto-discover */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Discovery URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.discoveryUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, discoveryUrl: e.target.value }))}
                placeholder="https://idp.example.com/.well-known/openid-configuration"
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              />
              <Button
                variant="ghost-glass"
                size="default"
                onClick={handleDiscovery}
                disabled={!formData.discoveryUrl || isDiscovering}
              >
                {isDiscovering ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Auto-discover endpoints from your provider's well-known configuration
            </p>
          </div>

          {/* Discovery Result */}
          {discoveryResult && (
            <div className={`p-3 rounded-xl border ${
              discoveryResult.success
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <div className="flex items-center gap-2">
                {discoveryResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span className="text-xs">{discoveryResult.message}</span>
              </div>
            </div>
          )}

          {/* Client Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                placeholder="your-client-id"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={formData.clientSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="your-client-secret"
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Scopes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Scopes
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {['openid', 'profile', 'email', 'groups', 'offline_access'].map(scope => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    formData.scopes.includes(scope)
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-slate-800/30 text-slate-400 border border-white/10 hover:border-purple-500/30'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add custom scope and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomScope(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all text-sm"
            />
          </div>

          {/* Redirect URLs */}
          <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <h3 className="font-medium text-slate-200 mb-4">Redirect URLs</h3>
            <p className="text-xs text-slate-400 mb-4">
              Configure these URLs in your Identity Provider
            </p>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">Redirect URI:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs">
                    {redirectUrl}
                  </code>
                  <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(redirectUrl)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-400 mb-1">Post-Logout Redirect URI:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-white/5 text-purple-300 text-xs">
                    {postLogoutRedirectUrl}
                  </code>
                  <Button variant="ghost-glass" size="sm" onClick={() => copyToClipboard(postLogoutRedirectUrl)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t border-white/5 pt-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              Advanced Settings
              <span className="ml-auto">{showAdvanced ? '▼' : '▶'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Manual Endpoint Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Issuer
                    </label>
                    <input
                      type="text"
                      value={formData.issuer}
                      onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Authorization URL
                    </label>
                    <input
                      type="url"
                      value={formData.authorizationUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, authorizationUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Token URL
                    </label>
                    <input
                      type="url"
                      value={formData.tokenUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, tokenUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      UserInfo URL
                    </label>
                    <input
                      type="url"
                      value={formData.userInfoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, userInfoUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      JWKS URL
                    </label>
                    <input
                      type="url"
                      value={formData.jwksUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, jwksUrl: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    />
                  </div>
                </div>

                {/* Response Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Response Type
                    </label>
                    <select
                      value={formData.responseType}
                      onChange={(e) => setFormData(prev => ({ ...prev, responseType: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    >
                      <option value="code">code</option>
                      <option value="id_token">id_token</option>
                      <option value="token">token</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Response Mode
                    </label>
                    <select
                      value={formData.responseMode}
                      onChange={(e) => setFormData(prev => ({ ...prev, responseMode: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500/50"
                    >
                      <option value="query">query</option>
                      <option value="fragment">fragment</option>
                      <option value="form_post">form_post</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
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
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
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
              disabled={isSaving || !formData.clientId || !formData.clientSecret}
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
              disabled={isTesting || !formData.clientId || !formData.clientSecret}
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