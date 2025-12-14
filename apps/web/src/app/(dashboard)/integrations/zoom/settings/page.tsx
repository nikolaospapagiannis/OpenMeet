'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, X, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';

export default function ZoomSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [integration, setIntegration] = useState<any>(null);
  const [settings, setSettings] = useState({
    autoJoinMeetings: true,
    recordAudio: true,
    recordVideo: false,
    enableTranscription: true,
    enableSummary: true,
    sendNotifications: true,
    botName: 'OpenMeet Notetaker',
  });

  useEffect(() => {
    fetchIntegration();
  }, []);

  const fetchIntegration = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getIntegrationStatus('zoom');
      setIntegration(data);

      if (data.settings) {
        setSettings({
          autoJoinMeetings: data.settings.autoJoinMeetings ?? true,
          recordAudio: data.settings.recordAudio ?? true,
          recordVideo: data.settings.recordVideo ?? false,
          enableTranscription: data.settings.enableTranscription ?? true,
          enableSummary: data.settings.enableSummary ?? true,
          sendNotifications: data.settings.sendNotifications ?? true,
          botName: data.settings.botName || 'OpenMeet Notetaker',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch Zoom integration:', err);
      setError('Failed to load Zoom settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await apiClient.initiateIntegrationOAuth('zoom');
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (err: any) {
      console.error('Failed to connect Zoom:', err);
      setError(err.response?.data?.message || 'Failed to connect Zoom');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Zoom? This will stop the bot from joining your meetings.')) {
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await apiClient.disconnectIntegration('zoom');
      setIntegration(null);
      setSuccess('Zoom disconnected successfully');
    } catch (err: any) {
      console.error('Failed to disconnect Zoom:', err);
      setError(err.response?.data?.message || 'Failed to disconnect Zoom');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      await apiClient.updateIntegrationSettings('zoom', settings);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleInputChange = (field: keyof typeof settings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading && !integration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading Zoom settings...</p>
        </div>
      </div>
    );
  }

  const isConnected = integration && integration.status === 'connected';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link href="/integrations">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Integrations
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 rounded-lg p-3">
              <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 3h5v5H5zm7 0h5v5h-5zm7 0h5v5h-5zM5 10h5v5H5zm7 0h5v5h-5zm7 0h5v5h-5zM5 17h5v5H5z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Zoom Integration</h1>
              <p className="text-gray-600 mt-1">
                Configure how OpenMeet joins and records your Zoom meetings
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* Connection Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              {isConnected
                ? 'Your Zoom account is connected to OpenMeet'
                : 'Connect your Zoom account to enable automatic meeting transcription'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConnected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <Check className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Connected</p>
                      <p className="text-sm text-green-700">
                        Connected as {integration.metadata?.email || 'Zoom User'}
                      </p>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
                    Disconnect
                  </Button>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Connected since:</p>
                  <p>{new Date(integration.connectedAt).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <X className="h-6 w-6 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Not Connected</p>
                      <p className="text-sm text-gray-600">
                        Connect your Zoom account to start recording meetings
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleConnect} disabled={isLoading}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Zoom
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">What happens when you connect?</h4>
                  <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                    <li>OpenMeet will get permission to join your Zoom meetings</li>
                    <li>The bot will automatically transcribe conversations</li>
                    <li>You'll get AI-generated meeting notes and summaries</li>
                    <li>All recordings are stored securely in your account</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bot Settings (only show if connected) */}
        {isConnected && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Bot Settings</CardTitle>
              <CardDescription>
                Configure how the OpenMeet bot behaves in your meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto-join Meetings */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-join meetings</Label>
                  <p className="text-sm text-gray-500">
                    Automatically join scheduled Zoom meetings
                  </p>
                </div>
                <Switch
                  checked={settings.autoJoinMeetings}
                  onCheckedChange={() => handleToggle('autoJoinMeetings')}
                />
              </div>

              {/* Bot Name */}
              <div className="space-y-2">
                <Label htmlFor="botName">Bot display name</Label>
                <Input
                  id="botName"
                  value={settings.botName}
                  onChange={(e) => handleInputChange('botName', e.target.value)}
                  placeholder="OpenMeet Notetaker"
                />
                <p className="text-sm text-gray-500">
                  This name will appear when the bot joins meetings
                </p>
              </div>

              {/* Record Audio */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Record audio</Label>
                  <p className="text-sm text-gray-500">
                    Enable audio recording for transcription
                  </p>
                </div>
                <Switch
                  checked={settings.recordAudio}
                  onCheckedChange={() => handleToggle('recordAudio')}
                />
              </div>

              {/* Record Video */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Record video</Label>
                  <p className="text-sm text-gray-500">
                    Record video of the meeting (increases storage)
                  </p>
                </div>
                <Switch
                  checked={settings.recordVideo}
                  onCheckedChange={() => handleToggle('recordVideo')}
                />
              </div>

              {/* Enable Transcription */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable transcription</Label>
                  <p className="text-sm text-gray-500">
                    Generate text transcripts of conversations
                  </p>
                </div>
                <Switch
                  checked={settings.enableTranscription}
                  onCheckedChange={() => handleToggle('enableTranscription')}
                />
              </div>

              {/* Enable Summary */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Generate AI summaries</Label>
                  <p className="text-sm text-gray-500">
                    Create meeting summaries with key points and action items
                  </p>
                </div>
                <Switch
                  checked={settings.enableSummary}
                  onCheckedChange={() => handleToggle('enableSummary')}
                />
              </div>

              {/* Send Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send notifications</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when transcripts are ready
                  </p>
                </div>
                <Switch
                  checked={settings.sendNotifications}
                  onCheckedChange={() => handleToggle('sendNotifications')}
                />
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help */}
        <div className="text-center text-sm text-gray-600">
          Need help? Check out our{' '}
          <a href="/docs/zoom-integration" className="text-blue-600 hover:underline">
            Zoom integration guide
          </a>
        </div>
      </div>
    </div>
  );
}
