'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ExtensionStatus from '@/components/extension/ExtensionStatus';
import BotInjectionSettings from '@/components/extension/BotInjectionSettings';
import MeetingDetection from '@/components/extension/MeetingDetection';
import QuickRecordWidget from '@/components/extension/QuickRecordWidget';
import ExtensionInstallGuide from '@/components/extension/ExtensionInstallGuide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Settings,
  Shield,
  Zap,
  Info,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface ExtensionSettings {
  autoRecordMeetings: boolean;
  recordAudio: boolean;
  recordVideo: boolean;
  captureSlides: boolean;
  enableLiveCaptions: boolean;
  defaultMeetingPrivacy: 'private' | 'team' | 'organization';
  excludedDomains: string[];
  notificationPreferences: {
    meetingStart: boolean;
    recordingComplete: boolean;
    processingComplete: boolean;
  };
  botInjectionMode: 'auto' | 'ask' | 'never';
  enabledPlatforms: {
    zoom: boolean;
    googleMeet: boolean;
    teams: boolean;
    webex: boolean;
  };
}

export default function ExtensionSettingsPage() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    autoRecordMeetings: true,
    recordAudio: true,
    recordVideo: false,
    captureSlides: true,
    enableLiveCaptions: true,
    defaultMeetingPrivacy: 'team',
    excludedDomains: [],
    notificationPreferences: {
      meetingStart: true,
      recordingComplete: true,
      processingComplete: true,
    },
    botInjectionMode: 'ask',
    enabledPlatforms: {
      zoom: true,
      googleMeet: true,
      teams: true,
      webex: true,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    checkExtensionStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/extension/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load extension settings');
    }
  };

  const checkExtensionStatus = () => {
    // Check if extension is installed by looking for injected element
    const extensionElement = document.querySelector('[data-nebula-extension]');
    if (extensionElement) {
      setExtensionInstalled(true);
      const version = extensionElement.getAttribute('data-version');
      setExtensionVersion(version || 'Unknown');
    } else {
      // Try to communicate with extension via custom event
      window.postMessage({ type: 'NEBULA_EXTENSION_PING' }, '*');

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'NEBULA_EXTENSION_PONG') {
          setExtensionInstalled(true);
          setExtensionVersion(event.data.version || 'Unknown');
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Clean up after 2 seconds if no response
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 2000);
    }
  };

  const handleSettingsChange = (updates: Partial<ExtensionSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/extension/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Extension settings saved successfully');
        setHasChanges(false);

        // Notify extension of settings update
        window.postMessage({
          type: 'NEBULA_SETTINGS_UPDATE',
          settings
        }, '*');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save extension settings');
    } finally {
      setIsLoading(false);
    }
  };

  const syncWithExtension = () => {
    if (!extensionInstalled) {
      toast.error('Extension is not installed');
      return;
    }

    window.postMessage({
      type: 'NEBULA_SYNC_REQUEST',
      settings
    }, '*');

    toast.success('Sync request sent to extension');
  };

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Chrome Extension Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your OpenMeet Chrome extension for seamless meeting recording
        </p>
      </div>

      {/* Extension Status Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <ExtensionStatus
            installed={extensionInstalled}
            version={extensionVersion}
            onRefresh={checkExtensionStatus}
          />
        </CardContent>
      </Card>

      {!extensionInstalled && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            The OpenMeet Chrome extension is not installed. Install it to enable botless recording directly from your browser.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="platforms">
            <Zap className="mr-2 h-4 w-4" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="mr-2 h-4 w-4" />
            Privacy & Security
          </TabsTrigger>
          <TabsTrigger value="install">
            <Download className="mr-2 h-4 w-4" />
            Installation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Bot Injection Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Recording Preferences</CardTitle>
              <CardDescription>
                Configure how the extension handles meeting recordings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BotInjectionSettings
                settings={{
                  botInjectionMode: settings.botInjectionMode,
                  autoRecordMeetings: settings.autoRecordMeetings,
                  recordAudio: settings.recordAudio,
                  recordVideo: settings.recordVideo,
                  captureSlides: settings.captureSlides,
                  enableLiveCaptions: settings.enableLiveCaptions,
                }}
                onChange={(updates) => handleSettingsChange(updates)}
              />
            </CardContent>
          </Card>

          {/* Quick Record Widget */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Recording</CardTitle>
              <CardDescription>
                Start a recording instantly from any meeting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickRecordWidget enabled={extensionInstalled} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meeting Platforms</CardTitle>
              <CardDescription>
                Select which platforms to enable for automatic detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingDetection
                enabledPlatforms={settings.enabledPlatforms}
                onChange={(platforms) => handleSettingsChange({ enabledPlatforms: platforms })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control privacy and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Meeting Privacy</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={settings.defaultMeetingPrivacy}
                  onChange={(e) => handleSettingsChange({
                    defaultMeetingPrivacy: e.target.value as 'private' | 'team' | 'organization'
                  })}
                >
                  <option value="private">Private - Only visible to me</option>
                  <option value="team">Team - Visible to my team</option>
                  <option value="organization">Organization - Visible to entire organization</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Excluded Domains</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter domains to exclude (one per line)"
                  rows={4}
                  value={settings.excludedDomains.join('\n')}
                  onChange={(e) => handleSettingsChange({
                    excludedDomains: e.target.value.split('\n').filter(d => d.trim())
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Meetings from these domains will not be automatically recorded
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Choose when to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences.meetingStart}
                    onChange={(e) => handleSettingsChange({
                      notificationPreferences: {
                        ...settings.notificationPreferences,
                        meetingStart: e.target.checked,
                      }
                    })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">When meeting recording starts</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences.recordingComplete}
                    onChange={(e) => handleSettingsChange({
                      notificationPreferences: {
                        ...settings.notificationPreferences,
                        recordingComplete: e.target.checked,
                      }
                    })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">When recording is complete</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences.processingComplete}
                    onChange={(e) => handleSettingsChange({
                      notificationPreferences: {
                        ...settings.notificationPreferences,
                        processingComplete: e.target.checked,
                      }
                    })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm">When transcription is ready</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="install">
          <ExtensionInstallGuide />
        </TabsContent>
      </Tabs>

      {/* Save Actions */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-background border rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
            <Button variant="outline" onClick={() => { loadSettings(); setHasChanges(false); }}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Sync Button */}
      {extensionInstalled && (
        <div className="fixed bottom-6 left-6">
          <Button
            variant="outline"
            size="sm"
            onClick={syncWithExtension}
            className="shadow-md"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync with Extension
          </Button>
        </div>
      )}
    </div>
  );
}