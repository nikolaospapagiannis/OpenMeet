/**
 * IntegrationSettings Component
 * Integration-specific settings configuration
 */

'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardGlass } from '@/components/ui/card-glass';
import { useIntegrations, Integration } from '@/hooks/useIntegrations';

export interface IntegrationSettingsProps {
  integration: Integration;
}

export function IntegrationSettings({ integration }: IntegrationSettingsProps) {
  const {
    updateIntegrationSettings,
    toggleIntegrationStatus,
    disconnectIntegration,
  } = useIntegrations();

  const [settings, setSettings] = useState<Record<string, any>>(
    integration.settings || {}
  );
  const [isActive, setIsActive] = useState(integration.isActive);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setSettings(integration.settings || {});
    setIsActive(integration.isActive);
  }, [integration]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');

      await updateIntegrationSettings(integration.id, settings);
      setSaveStatus('success');

      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      await toggleIntegrationStatus(integration.id, !isActive);
      setIsActive(!isActive);
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      await disconnectIntegration(integration.id);
      // Navigate back to integrations page
      if (typeof window !== 'undefined') {
        window.location.href = '/integrations';
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const renderTypeSpecificSettings = () => {
    switch (integration.type) {
      case 'slack':
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Default Channel
              </label>
              <input
                type="text"
                value={settings.defaultChannel || ''}
                onChange={(e) =>
                  setSettings({ ...settings, defaultChannel: e.target.value })
                }
                placeholder="#general"
                className="w-full px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-slate-500">
                Channel where meeting summaries will be posted
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoPost || false}
                  onChange={(e) =>
                    setSettings({ ...settings, autoPost: e.target.checked })
                  }
                  className="w-4 h-4 bg-slate-800 border-white/10 rounded"
                />
                <span className="text-sm text-slate-300">
                  Auto-post summaries after meetings
                </span>
              </label>
            </div>
          </>
        );

      case 'salesforce':
      case 'hubspot':
        return (
          <>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoSync || false}
                  onChange={(e) =>
                    setSettings({ ...settings, autoSync: e.target.checked })
                  }
                  className="w-4 h-4 bg-slate-800 border-white/10 rounded"
                />
                <span className="text-sm text-slate-300">
                  Auto-sync contacts and deals
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Sync Frequency
              </label>
              <select
                value={settings.syncFrequency || 'hourly'}
                onChange={(e) =>
                  setSettings({ ...settings, syncFrequency: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="manual">Manual only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.createActivities || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      createActivities: e.target.checked,
                    })
                  }
                  className="w-4 h-4 bg-slate-800 border-white/10 rounded"
                />
                <span className="text-sm text-slate-300">
                  Create activity records for meetings
                </span>
              </label>
            </div>
          </>
        );

      case 'google-calendar':
      case 'outlook':
        return (
          <>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.autoJoin || false}
                  onChange={(e) =>
                    setSettings({ ...settings, autoJoin: e.target.checked })
                  }
                  className="w-4 h-4 bg-slate-800 border-white/10 rounded"
                />
                <span className="text-sm text-slate-300">
                  Auto-join scheduled meetings
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Join Before Meeting Starts
              </label>
              <select
                value={settings.joinOffset || '0'}
                onChange={(e) =>
                  setSettings({ ...settings, joinOffset: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="0">At start time</option>
                <option value="60">1 minute before</option>
                <option value="120">2 minutes before</option>
                <option value="300">5 minutes before</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.syncAttendees || false}
                  onChange={(e) =>
                    setSettings({ ...settings, syncAttendees: e.target.checked })
                  }
                  className="w-4 h-4 bg-slate-800 border-white/10 rounded"
                />
                <span className="text-sm text-slate-300">
                  Sync attendee information
                </span>
              </label>
            </div>
          </>
        );

      default:
        return (
          <div className="text-sm text-slate-400">
            No additional settings available for this integration.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Section */}
      <CardGlass>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300 mb-1">
                Integration is currently{' '}
                <span
                  className={isActive ? 'text-green-400' : 'text-red-400'}
                >
                  {isActive ? 'active' : 'inactive'}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {isActive
                  ? 'Data is being synced automatically'
                  : 'Data sync is paused'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              className={
                isActive
                  ? 'border-red-500/30 text-red-400 hover:bg-red-900/20'
                  : 'border-green-500/30 text-green-400 hover:bg-green-900/20'
              }
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      </CardGlass>

      {/* Settings Section */}
      <CardGlass>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
          <div className="space-y-4">{renderTypeSpecificSettings()}</div>

          {/* Save Button */}
          <div className="mt-6 flex items-center space-x-4">
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isSaving ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>

            {saveStatus === 'success' && (
              <div className="flex items-center text-green-400 text-sm">
                <CheckCircle className="h-4 w-4 mr-1" />
                Settings saved
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="flex items-center text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                Failed to save
              </div>
            )}
          </div>
        </div>
      </CardGlass>

      {/* Connection Info */}
      <CardGlass>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Connection Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Connected on:</span>
              <span className="text-slate-300">
                {new Date(integration.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last synced:</span>
              <span className="text-slate-300">
                {integration.lastSyncAt
                  ? new Date(integration.lastSyncAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
            {integration.expiresAt && (
              <div className="flex justify-between">
                <span className="text-slate-400">Token expires:</span>
                <span className="text-slate-300">
                  {new Date(integration.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardGlass>

      {/* Danger Zone */}
      <CardGlass className="border-red-500/20">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4">
            Danger Zone
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
              <div>
                <p className="text-sm font-medium text-white">
                  Disconnect Integration
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  This will remove all configuration and stop syncing data
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="border-red-500/30 text-red-400 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </CardGlass>
    </div>
  );
}
