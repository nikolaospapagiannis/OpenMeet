'use client';

import { useState } from 'react';
import {
  Settings, Save, RotateCcw, Power, Bell, Calendar, Users,
  Clock, Shield, Zap, AlertCircle, CheckCircle, Info,
  ChevronRight, Copy, Trash2, Edit, Download, Upload
} from 'lucide-react';
import { CardGlass, CardGlassContent, CardGlassDescription, CardGlassHeader, CardGlassTitle } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { AIApp } from './AppMarketplace';

interface AppConfigurationProps {
  app: AIApp;
  onSave?: (config: AppConfig) => void;
  onDelete?: () => void;
}

export type AppConfig = {
  enabled: boolean;
  triggers: {
    automatic: boolean;
    manual: boolean;
    scheduled: boolean;
    scheduleTime?: string;
    scheduleFrequency?: string;
  };
  meetingTypes: {
    all: boolean;
    specific: string[];
  };
  notifications: {
    enabled: boolean;
    email: boolean;
    inApp: boolean;
    slack: boolean;
  };
  output: {
    format: string;
    destination: string;
    autoSave: boolean;
    includeInTranscript: boolean;
  };
  advanced: {
    priority: number;
    timeout: number;
    retryAttempts: number;
    maxTokens: number;
    temperature: number;
  };
  customization: {
    promptOverride?: string;
    variableMapping: Record<string, string>;
    outputTemplate?: string;
  };
  permissions: string[];
  integrations: {
    calendar: boolean;
    email: boolean;
    slack: boolean;
    teams: boolean;
    crm: boolean;
  };
};

export default function AppConfiguration({ app, onSave, onDelete }: AppConfigurationProps) {
  const [config, setConfig] = useState<AppConfig>({
    enabled: true,
    triggers: {
      automatic: true,
      manual: false,
      scheduled: false,
      scheduleTime: '09:00',
      scheduleFrequency: 'daily'
    },
    meetingTypes: {
      all: true,
      specific: []
    },
    notifications: {
      enabled: true,
      email: false,
      inApp: true,
      slack: false
    },
    output: {
      format: 'markdown',
      destination: 'notes',
      autoSave: true,
      includeInTranscript: false
    },
    advanced: {
      priority: 5,
      timeout: 30,
      retryAttempts: 3,
      maxTokens: 2000,
      temperature: 0.7
    },
    customization: {
      variableMapping: {}
    },
    permissions: ['read_transcript', 'write_notes'],
    integrations: {
      calendar: false,
      email: false,
      slack: false,
      teams: false,
      crm: false
    }
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const meetingTypes = [
    'Sales Calls',
    'Team Meetings',
    '1-on-1s',
    'Stand-ups',
    'All Hands',
    'Client Meetings',
    'Interviews',
    'Webinars',
    'Training Sessions',
    'Board Meetings'
  ];

  const handleConfigChange = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    onSave?.(config);
    setUnsavedChanges(false);
  };

  const handleReset = () => {
    // Reset to default config
    setUnsavedChanges(false);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string; border: string }> = {
      blue: { bg: 'bg-blue-500/20', text: 'text-white', icon: 'text-blue-400', border: 'border-blue-500/30' },
      orange: { bg: 'bg-orange-500/20', text: 'text-white', icon: 'text-orange-400', border: 'border-orange-500/30' },
      purple: { bg: 'bg-purple-500/20', text: 'text-white', icon: 'text-purple-400', border: 'border-purple-500/30' },
      green: { bg: 'bg-green-500/20', text: 'text-white', icon: 'text-green-400', border: 'border-green-500/30' },
      pink: { bg: 'bg-pink-500/20', text: 'text-white', icon: 'text-pink-400', border: 'border-pink-500/30' },
      teal: { bg: 'bg-teal-500/20', text: 'text-white', icon: 'text-teal-400', border: 'border-teal-500/30' },
      indigo: { bg: 'bg-indigo-500/20', text: 'text-white', icon: 'text-indigo-400', border: 'border-indigo-500/30' },
      cyan: { bg: 'bg-cyan-500/20', text: 'text-white', icon: 'text-cyan-400', border: 'border-cyan-500/30' },
    };
    return colors[color] || colors.blue;
  };

  const Icon = app.icon;
  const colors = getColorClasses(app.color);

  return (
    <div className="space-y-6">
      {/* Header */}
      <CardGlass>
        <CardGlassHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center`}>
                <Icon className={`h-7 w-7 ${colors.icon}`} />
              </div>
              <div>
                <CardGlassTitle className="text-xl text-white flex items-center gap-2">
                  {app.name}
                  {app.isPremium && (
                    <Badge className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                  {app.isNew && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      New
                    </Badge>
                  )}
                </CardGlassTitle>
                <CardGlassDescription className="mt-1">{app.description}</CardGlassDescription>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>v{app.version}</span>
                  <span>By {app.author}</span>
                  <span>Updated {app.updatedAt}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={config.enabled ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}
              >
                <Power className="h-3 w-3 mr-1" />
                {config.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => handleConfigChange({ ...config, enabled: checked })}
              />
            </div>
          </div>
        </CardGlassHeader>
      </CardGlass>

      {/* Configuration Tabs */}
      <CardGlass>
        <CardGlassContent className="p-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-slate-900/50 border border-white/10 mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="triggers">Triggers</TabsTrigger>
              <TabsTrigger value="output">Output</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Meeting Type Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="all-meetings">Enable for all meeting types</Label>
                    <Switch
                      id="all-meetings"
                      checked={config.meetingTypes.all}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        meetingTypes: { ...config.meetingTypes, all: checked }
                      })}
                    />
                  </div>

                  {!config.meetingTypes.all && (
                    <div>
                      <Label>Select specific meeting types</Label>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {meetingTypes.map(type => (
                          <label key={type} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={config.meetingTypes.specific.includes(type)}
                              onChange={(e) => {
                                const specific = e.target.checked
                                  ? [...config.meetingTypes.specific, type]
                                  : config.meetingTypes.specific.filter(t => t !== type);
                                handleConfigChange({
                                  ...config,
                                  meetingTypes: { ...config.meetingTypes, specific }
                                });
                              }}
                              className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                            />
                            <span className="text-sm text-slate-300">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                <div className="space-y-3">
                  {[
                    { id: 'read_transcript', label: 'Read meeting transcripts', required: true },
                    { id: 'write_notes', label: 'Write to meeting notes' },
                    { id: 'send_notifications', label: 'Send notifications' },
                    { id: 'access_calendar', label: 'Access calendar' },
                    { id: 'export_data', label: 'Export data' },
                    { id: 'manage_participants', label: 'Manage participants' }
                  ].map(permission => (
                    <label key={permission.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.permissions.includes(permission.id)}
                        disabled={permission.required}
                        onChange={(e) => {
                          const permissions = e.target.checked
                            ? [...config.permissions, permission.id]
                            : config.permissions.filter(p => p !== permission.id);
                          handleConfigChange({ ...config, permissions });
                        }}
                        className="rounded border-white/10 bg-slate-900/50 text-purple-500 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-300">
                        {permission.label}
                        {permission.required && (
                          <Badge variant="outline" className="ml-2 text-xs border-white/10">Required</Badge>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Triggers Tab */}
            <TabsContent value="triggers" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Trigger Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <div>
                        <Label htmlFor="trigger-auto" className="text-white">Automatic</Label>
                        <p className="text-xs text-slate-400">Run automatically after each meeting</p>
                      </div>
                    </div>
                    <Switch
                      id="trigger-auto"
                      checked={config.triggers.automatic}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        triggers: { ...config.triggers, automatic: checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-400" />
                      <div>
                        <Label htmlFor="trigger-manual" className="text-white">Manual</Label>
                        <p className="text-xs text-slate-400">Allow users to trigger manually</p>
                      </div>
                    </div>
                    <Switch
                      id="trigger-manual"
                      checked={config.triggers.manual}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        triggers: { ...config.triggers, manual: checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-purple-400" />
                      <div>
                        <Label htmlFor="trigger-scheduled" className="text-white">Scheduled</Label>
                        <p className="text-xs text-slate-400">Run on a schedule</p>
                      </div>
                    </div>
                    <Switch
                      id="trigger-scheduled"
                      checked={config.triggers.scheduled}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        triggers: { ...config.triggers, scheduled: checked }
                      })}
                    />
                  </div>

                  {config.triggers.scheduled && (
                    <div className="ml-12 space-y-3 p-4 bg-slate-900/30 rounded-lg border border-white/5">
                      <div>
                        <Label htmlFor="schedule-frequency">Frequency</Label>
                        <Select
                          value={config.triggers.scheduleFrequency}
                          onValueChange={(value) => handleConfigChange({
                            ...config,
                            triggers: { ...config.triggers, scheduleFrequency: value }
                          })}
                        >
                          <SelectTrigger id="schedule-frequency" className="bg-slate-900/50 border-white/10 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schedule-time">Time</Label>
                        <Input
                          id="schedule-time"
                          type="time"
                          value={config.triggers.scheduleTime}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            triggers: { ...config.triggers, scheduleTime: e.target.value }
                          })}
                          className="bg-slate-900/50 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Output Tab */}
            <TabsContent value="output" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Output Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="output-format">Output Format</Label>
                    <Select
                      value={config.output.format}
                      onValueChange={(value) => handleConfigChange({
                        ...config,
                        output: { ...config.output, format: value }
                      })}
                    >
                      <SelectTrigger id="output-format" className="bg-slate-900/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="plain">Plain Text</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="output-destination">Destination</Label>
                    <Select
                      value={config.output.destination}
                      onValueChange={(value) => handleConfigChange({
                        ...config,
                        output: { ...config.output, destination: value }
                      })}
                    >
                      <SelectTrigger id="output-destination" className="bg-slate-900/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notes">Meeting Notes</SelectItem>
                        <SelectItem value="file">Download as File</SelectItem>
                        <SelectItem value="email">Send via Email</SelectItem>
                        <SelectItem value="webhook">Send to Webhook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save">Auto-save output</Label>
                    <Switch
                      id="auto-save"
                      checked={config.output.autoSave}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        output: { ...config.output, autoSave: checked }
                      })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-transcript">Include in transcript</Label>
                    <Switch
                      id="include-transcript"
                      checked={config.output.includeInTranscript}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        output: { ...config.output, includeInTranscript: checked }
                      })}
                    />
                  </div>
                </div>
              </div>

              {app.customizable && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Output Customization</h3>
                  <div>
                    <Label htmlFor="output-template">Custom Output Template</Label>
                    <Textarea
                      id="output-template"
                      rows={6}
                      placeholder="Customize how the output is formatted..."
                      value={config.customization.outputTemplate}
                      onChange={(e) => handleConfigChange({
                        ...config,
                        customization: { ...config.customization, outputTemplate: e.target.value }
                      })}
                      className="bg-slate-900/50 border-white/10 text-white font-mono text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Use variables like {'{{title}}'}, {'{{content}}'}, {'{{date}}'} to customize output
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications-enabled">Enable notifications</Label>
                    <Switch
                      id="notifications-enabled"
                      checked={config.notifications.enabled}
                      onCheckedChange={(checked) => handleConfigChange({
                        ...config,
                        notifications: { ...config.notifications, enabled: checked }
                      })}
                    />
                  </div>

                  {config.notifications.enabled && (
                    <div className="space-y-3 p-4 bg-slate-900/30 rounded-lg border border-white/5">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.notifications.inApp}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            notifications: { ...config.notifications, inApp: e.target.checked }
                          })}
                          className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                        />
                        <span className="text-sm text-slate-300">In-app notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.notifications.email}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            notifications: { ...config.notifications, email: e.target.checked }
                          })}
                          className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                        />
                        <span className="text-sm text-slate-300">Email notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.notifications.slack}
                          onChange={(e) => handleConfigChange({
                            ...config,
                            notifications: { ...config.notifications, slack: e.target.checked }
                          })}
                          className="rounded border-white/10 bg-slate-900/50 text-purple-500"
                        />
                        <span className="text-sm text-slate-300">Slack notifications</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  Notifications will be sent when the app completes processing or encounters errors.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Advanced Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority">Execution Priority: {config.advanced.priority}</Label>
                    <Slider
                      id="priority"
                      min={1}
                      max={10}
                      step={1}
                      value={[config.advanced.priority]}
                      onValueChange={([value]) => handleConfigChange({
                        ...config,
                        advanced: { ...config.advanced, priority: value }
                      })}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Higher priority apps run first</p>
                  </div>

                  <div>
                    <Label htmlFor="timeout">Timeout (seconds): {config.advanced.timeout}</Label>
                    <Slider
                      id="timeout"
                      min={10}
                      max={120}
                      step={10}
                      value={[config.advanced.timeout]}
                      onValueChange={([value]) => handleConfigChange({
                        ...config,
                        advanced: { ...config.advanced, timeout: value }
                      })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="retry-attempts">Retry Attempts: {config.advanced.retryAttempts}</Label>
                    <Slider
                      id="retry-attempts"
                      min={0}
                      max={5}
                      step={1}
                      value={[config.advanced.retryAttempts]}
                      onValueChange={([value]) => handleConfigChange({
                        ...config,
                        advanced: { ...config.advanced, retryAttempts: value }
                      })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-tokens">Max Tokens: {config.advanced.maxTokens}</Label>
                    <Slider
                      id="max-tokens"
                      min={500}
                      max={4000}
                      step={100}
                      value={[config.advanced.maxTokens]}
                      onValueChange={([value]) => handleConfigChange({
                        ...config,
                        advanced: { ...config.advanced, maxTokens: value }
                      })}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="temperature">AI Temperature: {config.advanced.temperature}</Label>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[config.advanced.temperature]}
                      onValueChange={([value]) => handleConfigChange({
                        ...config,
                        advanced: { ...config.advanced, temperature: value }
                      })}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Higher = more creative, Lower = more focused</p>
                  </div>
                </div>
              </div>

              {app.customizable && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Prompt Override</h3>
                  <div>
                    <Label htmlFor="prompt-override">Custom Prompt</Label>
                    <Textarea
                      id="prompt-override"
                      rows={6}
                      placeholder="Override the default prompt template..."
                      value={config.customization.promptOverride}
                      onChange={(e) => handleConfigChange({
                        ...config,
                        customization: { ...config.customization, promptOverride: e.target.value }
                      })}
                      className="bg-slate-900/50 border-white/10 text-white font-mono text-sm"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Connected Services</h3>
                <div className="space-y-3">
                  {[
                    { id: 'calendar', name: 'Google Calendar', icon: Calendar },
                    { id: 'email', name: 'Email (Gmail/Outlook)', icon: Bell },
                    { id: 'slack', name: 'Slack', icon: Users },
                    { id: 'teams', name: 'Microsoft Teams', icon: Users },
                    { id: 'crm', name: 'CRM (Salesforce/HubSpot)', icon: Shield }
                  ].map(integration => {
                    const IntegrationIcon = integration.icon;
                    const isConnected = config.integrations[integration.id as keyof typeof config.integrations];

                    return (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <IntegrationIcon className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-white">{integration.name}</p>
                            <p className="text-xs text-slate-400">
                              {isConnected ? 'Connected' : 'Not connected'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={isConnected ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}
                        >
                          {isConnected ? 'Disconnect' : 'Connect'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardGlassContent>
      </CardGlass>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Uninstall App
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-slate-400"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Config
          </Button>
          <Button
            variant="outline"
            className="border-white/10 text-slate-400"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Config
          </Button>
        </div>
        <div className="flex gap-2">
          {unsavedChanges && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!unsavedChanges}
            className="border-white/10 text-slate-400"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!unsavedChanges}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-red-300">Are you sure you want to uninstall this app?</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-white/10 text-slate-400"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onDelete?.();
                  setShowDeleteConfirm(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Uninstall
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}