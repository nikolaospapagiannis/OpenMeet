'use client';

import { useState } from 'react';
import { Shield, Key, Users, CheckCircle, Copy, AlertTriangle, Settings, Globe, Zap } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { SAMLConfigForm } from '@/components/sso/SAMLConfigForm';
import { OIDCConfigForm } from '@/components/sso/OIDCConfigForm';
import { SCIMProvisioning } from '@/components/sso/SCIMProvisioning';
import { DomainVerification } from '@/components/sso/DomainVerification';
import { TestConnection } from '@/components/sso/TestConnection';

export default function SSOSettingsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'saml' | 'oidc' | 'scim' | 'domains' | 'test'>('overview');
  const [protocol, setProtocol] = useState<'SAML' | 'OIDC'>('SAML');
  const [provider, setProvider] = useState<'okta' | 'azure_ad' | 'auth0' | 'google_workspace' | 'custom'>('okta');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [enforceSSO, setEnforceSSO] = useState(false);
  const [scimEnabled, setScimEnabled] = useState(false);
  const [jitProvisioning, setJitProvisioning] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [domains, setDomains] = useState<any[]>([]);

  const stats = {
    activeSessions: 24,
    totalUsers: 156,
    jitProvisionedUsers: 89,
    scimUsers: 67,
    verifiedDomains: 3,
    totalDomains: 5
  };

  const organizationId = 'org-123'; // TODO: Get from context

  // Mock handlers for components
  const handleSaveConfig = async (config: any) => {
    console.log('Saving configuration:', config);
    setIsConfigured(true);
    // TODO: Implement actual save logic
  };

  const handleTestConnection = async () => {
    // TODO: Implement actual test logic
    return {
      success: true,
      provider,
      protocol,
      timestamp: new Date(),
      steps: [
        { id: 'config', name: 'Validate Configuration', status: 'success' as const, duration: 120 },
        { id: 'metadata', name: 'Fetch Metadata/Discovery', status: 'success' as const, duration: 340 },
        { id: 'connection', name: 'Test IdP Connection', status: 'success' as const, duration: 550 },
        { id: 'auth', name: 'Initiate Authentication', status: 'success' as const, duration: 1200 },
        { id: 'response', name: 'Process Response', status: 'success' as const, duration: 80 },
        { id: 'attributes', name: 'Map User Attributes', status: 'success' as const, duration: 45 },
        { id: 'provision', name: 'Test Provisioning', status: 'success' as const, duration: 230 }
      ],
      userInfo: {
        email: 'test@example.com',
        name: 'Test User',
        id: 'user_123',
        groups: ['Engineering', 'Admin']
      }
    };
  };

  const handleToggleSCIM = async (enabled: boolean) => {
    setScimEnabled(enabled);
    // TODO: Implement actual toggle logic
  };

  const handleRegenerateToken = async () => {
    // TODO: Implement actual token generation
    return 'scim_' + Math.random().toString(36).substring(2, 15);
  };

  const handleAddDomain = async (domain: string) => {
    // TODO: Implement actual domain addition
    const newDomain = {
      id: Math.random().toString(36).substring(7),
      domain,
      status: 'pending' as const,
      verificationMethod: 'dns_txt' as const,
      verificationToken: 'nebula-verify-' + Math.random().toString(36).substring(2, 15),
      verificationRecord: '_nebula-sso-verification',
      addedAt: new Date()
    };
    setDomains([...domains, newDomain]);
    return newDomain;
  };

  const handleVerifyDomain = async (domainId: string) => {
    // TODO: Implement actual verification logic
    const success = Math.random() > 0.3;
    if (success) {
      setDomains(domains.map(d =>
        d.id === domainId ? { ...d, status: 'verified', verifiedAt: new Date() } : d
      ));
    }
    return success;
  };

  const handleRemoveDomain = async (domainId: string) => {
    // TODO: Implement actual removal logic
    setDomains(domains.filter(d => d.id !== domainId));
  };

  const handleDiscoverOIDC = async (discoveryUrl: string) => {
    // TODO: Implement actual discovery
    return {
      issuer: discoveryUrl.replace('/.well-known/openid-configuration', ''),
      authorizationUrl: discoveryUrl.replace('/.well-known/openid-configuration', '/authorize'),
      tokenUrl: discoveryUrl.replace('/.well-known/openid-configuration', '/token'),
      userInfoUrl: discoveryUrl.replace('/.well-known/openid-configuration', '/userinfo'),
      jwksUrl: discoveryUrl.replace('/.well-known/openid-configuration', '/keys')
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-teal-400" />
            <h1 className="text-3xl font-bold text-white">Enterprise SSO & Identity Management</h1>
          </div>
          <p className="text-slate-400">Configure single sign-on, SCIM provisioning, and domain verification for your organization</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <Button
            variant={activeTab === 'overview' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('overview')}
          >
            <Settings className="w-4 h-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeTab === 'saml' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('saml')}
          >
            <Key className="w-4 h-4 mr-2" />
            SAML 2.0
          </Button>
          <Button
            variant={activeTab === 'oidc' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('oidc')}
          >
            <Key className="w-4 h-4 mr-2" />
            OIDC
          </Button>
          <Button
            variant={activeTab === 'scim' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('scim')}
          >
            <Users className="w-4 h-4 mr-2" />
            SCIM
          </Button>
          <Button
            variant={activeTab === 'domains' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('domains')}
          >
            <Globe className="w-4 h-4 mr-2" />
            Domains
          </Button>
          <Button
            variant={activeTab === 'test' ? 'gradient-primary' : 'ghost-glass'}
            size="sm"
            onClick={() => setActiveTab('test')}
          >
            <Zap className="w-4 h-4 mr-2" />
            Test
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <CardGlass variant="default" hover>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Active Sessions</span>
                    <Users className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-3xl font-bold text-white">{stats.activeSessions}</span>
                </div>
              </CardGlass>

              <CardGlass variant="default" hover>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Total Users</span>
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <span className="text-3xl font-bold text-white">{stats.totalUsers}</span>
                </div>
              </CardGlass>

              <CardGlass variant="default" hover>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Verified Domains</span>
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-3xl font-bold text-white">{stats.verifiedDomains}/{stats.totalDomains}</span>
                </div>
              </CardGlass>

              <CardGlass variant="default" hover>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">SCIM Users</span>
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-3xl font-bold text-white">{stats.scimUsers}</span>
                </div>
              </CardGlass>
            </div>

            {/* Overview Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <CardGlass variant="default" hover>
                  <div className="flex items-center gap-2 mb-6">
                    <Key className="w-5 h-5 text-teal-400" />
                    <h2 className="text-xl font-semibold text-white">SSO Configuration Status</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                      <div>
                        <div className="text-sm font-medium text-slate-200">SSO Enabled</div>
                        <div className="text-xs text-slate-500 mt-1">Allow users to login via single sign-on</div>
                      </div>
                      <Switch
                        checked={ssoEnabled}
                        onCheckedChange={setSsoEnabled}
                        className="data-[state=checked]:bg-teal-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                      <div>
                        <div className="text-sm font-medium text-slate-200">Enforce SSO</div>
                        <div className="text-xs text-slate-500 mt-1">Require all users to login via SSO</div>
                      </div>
                      <Switch
                        checked={enforceSSO}
                        onCheckedChange={setEnforceSSO}
                        className="data-[state=checked]:bg-purple-500"
                        disabled={!ssoEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                      <div>
                        <div className="text-sm font-medium text-slate-200">JIT Provisioning</div>
                        <div className="text-xs text-slate-500 mt-1">Automatically create users on first login</div>
                      </div>
                      <Switch
                        checked={jitProvisioning}
                        onCheckedChange={setJitProvisioning}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
                      <div>
                        <div className="text-sm font-medium text-slate-200">SCIM Provisioning</div>
                        <div className="text-xs text-slate-500 mt-1">Sync users and groups from your IdP</div>
                      </div>
                      <Badge variant={scimEnabled ? 'success' : 'secondary'}>
                        {scimEnabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Protocol:</span>
                          <span className="ml-2 text-white font-medium">{protocol}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Provider:</span>
                          <span className="ml-2 text-white font-medium capitalize">{provider.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Configuration:</span>
                          <Badge variant={isConfigured ? 'success' : 'warning'} className="ml-2">
                            {isConfigured ? 'Complete' : 'Pending'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-slate-400">Domains:</span>
                          <span className="ml-2 text-white font-medium">{domains.filter(d => d.status === 'verified').length} verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardGlass>
              </div>

              <div className="space-y-6">
                <CardGlass variant="default" hover>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-semibold text-white">Setup Checklist</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 ${isConfigured ? 'bg-green-400 border-green-400' : 'border-slate-500'}`}>
                        {isConfigured && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm ${isConfigured ? 'text-white' : 'text-slate-400'}`}>
                        Configure SSO Provider
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 ${domains.some(d => d.status === 'verified') ? 'bg-green-400 border-green-400' : 'border-slate-500'}`}>
                        {domains.some(d => d.status === 'verified') && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm ${domains.some(d => d.status === 'verified') ? 'text-white' : 'text-slate-400'}`}>
                        Verify Domain
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 ${scimEnabled ? 'bg-green-400 border-green-400' : 'border-slate-500'}`}>
                        {scimEnabled && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm ${scimEnabled ? 'text-white' : 'text-slate-400'}`}>
                        Enable SCIM
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 ${ssoEnabled ? 'bg-green-400 border-green-400' : 'border-slate-500'}`}>
                        {ssoEnabled && <CheckCircle className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-sm ${ssoEnabled ? 'text-white' : 'text-slate-400'}`}>
                        Enable SSO
                      </span>
                    </div>
                  </div>
                </CardGlass>

                <CardGlass variant="default" className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Important</h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Test your SSO configuration thoroughly before enforcing it for all users. Incorrect configuration may lock users out of the system.
                  </p>
                </CardGlass>
              </div>
            </div>
          </>
        )}

        {/* SAML Tab */}
        {activeTab === 'saml' && (
          <SAMLConfigForm
            config={undefined}
            onSave={handleSaveConfig}
            onTest={async () => true}
          />
        )}

        {/* OIDC Tab */}
        {activeTab === 'oidc' && (
          <OIDCConfigForm
            config={undefined}
            onSave={handleSaveConfig}
            onTest={async () => true}
            onDiscover={handleDiscoverOIDC}
          />
        )}

        {/* SCIM Tab */}
        {activeTab === 'scim' && (
          <SCIMProvisioning
            config={{
              enabled: scimEnabled,
              token: 'scim_abc123def456...',
              baseUrl: `${window.location.origin}/api/scim/v2`,
              supportedOperations: ['User Creation', 'User Updates', 'User Deactivation', 'Group Management'],
              stats: {
                totalUsers: stats.scimUsers,
                totalGroups: 12,
                activeUsers: stats.scimUsers - 10,
                suspendedUsers: 10,
                failedOperations: 0
              }
            }}
            onToggle={handleToggleSCIM}
            onRegenerateToken={handleRegenerateToken}
            onSyncNow={async () => { console.log('Syncing...'); }}
            organizationId={organizationId}
          />
        )}

        {/* Domains Tab */}
        {activeTab === 'domains' && (
          <DomainVerification
            domains={domains}
            onAddDomain={handleAddDomain}
            onRemoveDomain={handleRemoveDomain}
            onVerifyDomain={handleVerifyDomain}
            organizationId={organizationId}
          />
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <TestConnection
            provider={provider}
            protocol={protocol}
            onTest={handleTestConnection}
            onInitiateFlow={() => console.log('Initiating login flow...')}
            isConfigured={isConfigured}
          />
        )}
      </div>
    </div>
  );
}