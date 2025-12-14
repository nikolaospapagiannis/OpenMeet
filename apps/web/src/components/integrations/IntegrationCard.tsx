/**
 * IntegrationCard Component
 * Displays integration information with connect/disconnect actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  X,
  Settings,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CardGlass,
  CardGlassContent,
  CardGlassDescription,
  CardGlassHeader,
  CardGlassTitle,
} from '@/components/ui/card-glass';
import { OAuthConnectButton } from './OAuthConnectButton';
import { useIntegrations, Integration } from '@/hooks/useIntegrations';

export interface IntegrationCardProps {
  id: string;
  type: string;
  name: string;
  description: string;
  category: 'video' | 'calendar' | 'crm' | 'communication' | 'storage' | 'productivity';
  icon: any;
  features: string[];
  setupTime: string;
  connectedIntegration?: Integration;
}

export function IntegrationCard({
  id,
  type,
  name,
  description,
  category,
  icon: Icon,
  features,
  setupTime,
  connectedIntegration,
}: IntegrationCardProps) {
  const router = useRouter();
  const {
    disconnectIntegration,
    syncIntegration,
    testIntegration,
  } = useIntegrations();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isConnected = !!connectedIntegration;
  const lastSync = connectedIntegration?.lastSyncAt;
  const accountInfo = connectedIntegration?.metadata;

  const handleDisconnect = async () => {
    if (!connectedIntegration) return;

    if (!confirm(`Are you sure you want to disconnect ${name}?`)) {
      return;
    }

    try {
      await disconnectIntegration(connectedIntegration.id);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSync = async () => {
    if (!connectedIntegration) return;

    try {
      setIsSyncing(true);
      await syncIntegration(connectedIntegration.id);
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTest = async () => {
    if (!connectedIntegration) return;

    try {
      setIsTesting(true);
      setTestResult(null);
      const result = await testIntegration(connectedIntegration.id);
      setTestResult(result);

      // Clear result after 3 seconds
      setTimeout(() => setTestResult(null), 3000);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
      setTimeout(() => setTestResult(null), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <CardGlass
      hover
      padding="none"
      className={isConnected ? 'border-green-500/30' : ''}
    >
      <CardGlassHeader className="p-6 pb-4 border-b-0">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800/60 rounded-lg border border-white/10">
              <Icon className="h-6 w-6 text-slate-300" />
            </div>
            <div>
              <CardGlassTitle className="text-lg text-white">
                {name}
              </CardGlassTitle>
              {isConnected && (
                <div className="flex items-center mt-1">
                  <Check className="h-3 w-3 text-green-400 mr-1" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              )}
            </div>
          </div>
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Disconnect"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardGlassHeader>

      <CardGlassContent className="p-6 pt-0">
        <CardGlassDescription className="mb-4 text-slate-400">
          {description}
        </CardGlassDescription>

        {/* Connected Account Info */}
        {isConnected && accountInfo && (
          <div className="mb-4 p-3 bg-slate-800/40 rounded-lg border border-white/5">
            {accountInfo.email && (
              <p className="text-sm text-slate-300">{accountInfo.email}</p>
            )}
            {accountInfo.name && (
              <p className="text-sm text-slate-300">{accountInfo.name}</p>
            )}
            {accountInfo.teamName && (
              <p className="text-sm text-slate-300">{accountInfo.teamName}</p>
            )}
            {lastSync && (
              <p className="text-xs text-slate-500 mt-1">
                Last synced: {new Date(lastSync).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div
            className={`mb-4 p-3 rounded-lg border flex items-center ${
              testResult.success
                ? 'bg-green-900/20 border-green-500/30'
                : 'bg-red-900/20 border-red-500/30'
            }`}
          >
            {testResult.success ? (
              <Check className="h-4 w-4 text-green-400 mr-2 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" />
            )}
            <span
              className={`text-sm ${
                testResult.success ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {testResult.message}
            </span>
          </div>
        )}

        {/* Features */}
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-400 mb-2">Features:</p>
          <div className="space-y-1">
            {features.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                className="flex items-center text-xs text-slate-400"
              >
                <Check className="h-3 w-3 text-teal-400 mr-1 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Setup time: {setupTime}
            </span>
          </div>

          {isConnected ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/integrations/${type}/settings`)}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-bg-layer)] hover:border-purple-500/30 hover:text-[var(--ff-text-primary)]"
              >
                <Settings className="h-3 w-3 mr-1" />
                Settings
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-bg-layer)] hover:border-purple-500/30 hover:text-[var(--ff-text-primary)]"
              >
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Sync
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting}
                className="border-[var(--ff-border)] text-[var(--ff-text-secondary)] hover:bg-[var(--ff-bg-layer)] hover:border-purple-500/30 hover:text-[var(--ff-text-primary)]"
              >
                {isTesting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                Test
              </Button>
            </div>
          ) : (
            <OAuthConnectButton
              type={type}
              label="Connect"
              size="sm"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white border-0"
            />
          )}
        </div>
      </CardGlassContent>
    </CardGlass>
  );
}
