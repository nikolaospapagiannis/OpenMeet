'use client';

import React, { useState } from 'react';
import { Users, Key, Copy, RefreshCw, Shield, Activity, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface SCIMConfig {
  enabled: boolean;
  token: string;
  tokenCreatedAt?: Date;
  tokenExpiresAt?: Date;
  baseUrl: string;
  supportedOperations: string[];
  lastSync?: Date;
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success';
  syncMessage?: string;
  stats: {
    totalUsers: number;
    totalGroups: number;
    activeUsers: number;
    suspendedUsers: number;
    lastUserProvisioned?: Date;
    lastUserDeprovisioned?: Date;
    failedOperations: number;
  };
}

interface SCIMProvisioningProps {
  config?: SCIMConfig;
  onToggle: (enabled: boolean) => Promise<void>;
  onRegenerateToken: () => Promise<string>;
  onSyncNow?: () => Promise<void>;
  organizationId: string;
}

export const SCIMProvisioning: React.FC<SCIMProvisioningProps> = ({
  config,
  onToggle,
  onRegenerateToken,
  onSyncNow,
  organizationId
}) => {
  const [isEnabled, setIsEnabled] = useState(config?.enabled || false);
  const [token, setToken] = useState(config?.token || '');
  const [showToken, setShowToken] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(config?.syncStatus || 'idle');
  const [showTokenWarning, setShowTokenWarning] = useState(false);

  const baseUrl = config?.baseUrl || `${window.location.origin}/api/scim/v2`;
  const stats = config?.stats || {
    totalUsers: 0,
    totalGroups: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    failedOperations: 0
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      await onToggle(enabled);
      setIsEnabled(enabled);
      if (enabled && !token) {
        // Generate initial token when enabling SCIM
        handleRegenerateToken();
      }
    } catch (error) {
      console.error('Failed to toggle SCIM:', error);
    }
  };

  const handleRegenerateToken = async () => {
    setShowTokenWarning(true);
  };

  const confirmRegenerateToken = async () => {
    setIsRegenerating(true);
    setShowTokenWarning(false);
    try {
      const newToken = await onRegenerateToken();
      setToken(newToken);
      setShowToken(true);
      // Auto-hide token after 30 seconds for security
      setTimeout(() => setShowToken(false), 30000);
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSyncNow = async () => {
    if (!onSyncNow) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await onSyncNow();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const supportedOperations = [
    'User Creation',
    'User Updates',
    'User Deactivation',
    'Group Management',
    'Bulk Operations',
    'Password Sync'
  ];

  return (
    <div className="space-y-6">
      {/* Main SCIM Configuration */}
      <CardGlass variant="default" hover>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">SCIM 2.0 Provisioning</h2>
            <Badge variant={isEnabled ? 'success' : 'secondary'}>
              {isEnabled ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>

        {isEnabled && (
          <div className="space-y-6">
            {/* SCIM Endpoint */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                SCIM Base URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-cyan-300 font-mono text-sm">
                  {baseUrl}
                </code>
                <Button variant="ghost-glass" size="default" onClick={() => copyToClipboard(baseUrl)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Configure this URL in your Identity Provider's SCIM settings
              </p>
            </div>

            {/* Bearer Token */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Bearer Token
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token || 'scim_' + '•'.repeat(40)}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-cyan-300 font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showToken ? '🙈' : '👁️'}
                  </button>
                </div>
                <Button variant="ghost-glass" size="default" onClick={() => copyToClipboard(token)}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost-glass"
                  size="default"
                  onClick={handleRegenerateToken}
                  disabled={isRegenerating}
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Use this token for authentication in your IdP. Keep it secure!
              </p>
            </div>

            {/* Token Warning Dialog */}
            {showTokenWarning && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-300 mb-2">
                      Regenerate SCIM Token?
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      This will invalidate the current token. Your IdP will need to be updated with the new token or provisioning will stop working.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="gradient-primary"
                        size="sm"
                        onClick={confirmRegenerateToken}
                      >
                        Regenerate Token
                      </Button>
                      <Button
                        variant="ghost-glass"
                        size="sm"
                        onClick={() => setShowTokenWarning(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supported Operations */}
            <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Supported Operations</h3>
              <div className="grid grid-cols-2 gap-2">
                {supportedOperations.map(op => (
                  <div key={op} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-slate-400">{op}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardGlass>

      {/* SCIM Statistics */}
      {isEnabled && (
        <CardGlass variant="default" hover>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Provisioning Statistics</h3>
            </div>
            {onSyncNow && (
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Sync Status */}
          {syncStatus !== 'idle' && (
            <div className={`mb-4 p-3 rounded-lg border ${
              syncStatus === 'syncing' ? 'bg-blue-500/10 border-blue-500/30' :
              syncStatus === 'success' ? 'bg-green-500/10 border-green-500/30' :
              syncStatus === 'error' ? 'bg-red-500/10 border-red-500/30' :
              'bg-slate-800/30 border-white/5'
            }`}>
              <div className="flex items-center gap-2">
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />}
                {syncStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className="text-sm text-slate-300">
                  {syncStatus === 'syncing' ? 'Synchronizing with identity provider...' :
                   syncStatus === 'success' ? 'Synchronization completed successfully' :
                   syncStatus === 'error' ? 'Synchronization failed. Check logs for details.' :
                   config?.syncMessage || 'Ready to sync'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
              <div className="text-xs text-slate-400">Total Users</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <div className="text-2xl font-bold text-green-400">{stats.activeUsers}</div>
              <div className="text-xs text-slate-400">Active Users</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <div className="text-2xl font-bold text-amber-400">{stats.suspendedUsers}</div>
              <div className="text-xs text-slate-400">Suspended</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/30 border border-white/5">
              <div className="text-2xl font-bold text-cyan-400">{stats.totalGroups}</div>
              <div className="text-xs text-slate-400">Groups</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Last User Provisioned:</span>
              <span className="text-slate-300">{formatDate(stats.lastUserProvisioned)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last User Deprovisioned:</span>
              <span className="text-slate-300">{formatDate(stats.lastUserDeprovisioned)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Last Sync:</span>
              <span className="text-slate-300">{formatDate(config?.lastSync)}</span>
            </div>
            {stats.failedOperations > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Failed Operations:</span>
                <span className="font-medium">{stats.failedOperations}</span>
              </div>
            )}
          </div>
        </CardGlass>
      )}

      {/* SCIM Setup Guide */}
      {isEnabled && (
        <CardGlass variant="default" className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">SCIM Setup Guide</h3>
              <ol className="space-y-2 text-xs text-slate-400">
                <li>1. Copy the SCIM Base URL and Bearer Token above</li>
                <li>2. In your Identity Provider, navigate to the SCIM provisioning settings</li>
                <li>3. Set the Base URL to the value provided above</li>
                <li>4. Configure authentication using Bearer Token with the token provided</li>
                <li>5. Enable user and group provisioning as needed</li>
                <li>6. Test the connection and save your configuration</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-xs text-slate-500">
                  Supported Providers: Okta, Azure AD, OneLogin, Auth0, Google Workspace
                </p>
              </div>
            </div>
          </div>
        </CardGlass>
      )}
    </div>
  );
};