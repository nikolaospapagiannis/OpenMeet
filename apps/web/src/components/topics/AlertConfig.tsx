'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  TrendingUp,
  AlertCircle,
  Activity,
  Mail,
  Smartphone,
  Clock,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import apiClient from '@/lib/api';

interface AlertConfiguration {
  type: 'mention_spike' | 'first_mention' | 'sentiment_change';
  threshold: number;
  enabled: boolean;
  recipients: string[];
  channels: ('email' | 'in_app' | 'sms')[];
  timeWindow?: number; // in hours
}

interface AlertHistory {
  id: string;
  timestamp: Date;
  type: string;
  message: string;
  triggered: boolean;
}

interface AlertConfigProps {
  topicId: string;
  topicName: string;
  currentAlertConfig?: AlertConfiguration[];
  onSave: (config: AlertConfiguration[]) => void;
}

export default function AlertConfig({
  topicId,
  topicName,
  currentAlertConfig = [],
  onSave
}: AlertConfigProps) {
  const [configs, setConfigs] = useState<AlertConfiguration[]>(currentAlertConfig);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [selectedConfig, setSelectedConfig] = useState<number>(0);

  useEffect(() => {
    if (currentAlertConfig.length === 0) {
      // Initialize with default configurations
      setConfigs([
        {
          type: 'mention_spike',
          threshold: 10,
          enabled: false,
          recipients: [],
          channels: ['email', 'in_app'],
          timeWindow: 24
        },
        {
          type: 'first_mention',
          threshold: 1,
          enabled: false,
          recipients: [],
          channels: ['in_app'],
          timeWindow: 1
        },
        {
          type: 'sentiment_change',
          threshold: -20, // percentage change
          enabled: false,
          recipients: [],
          channels: ['email', 'in_app'],
          timeWindow: 48
        }
      ]);
    }
    fetchAlertHistory();
  }, [topicId]);

  const fetchAlertHistory = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getTopicAlerts(topicId, { limit: 10 });
      setAlertHistory(response.alerts);
    } catch (error) {
      console.error('Error fetching alert history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each configuration
      for (const config of configs) {
        await apiClient.configureTopicAlert(topicId, config);
      }
      onSave(configs);
    } catch (error) {
      console.error('Error saving alert configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (index: number, updates: Partial<AlertConfiguration>) => {
    setConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = { ...newConfigs[index], ...updates };
      return newConfigs;
    });
  };

  const addRecipient = (index: number) => {
    if (newRecipient && !configs[index].recipients.includes(newRecipient)) {
      updateConfig(index, {
        recipients: [...configs[index].recipients, newRecipient]
      });
      setNewRecipient('');
    }
  };

  const removeRecipient = (configIndex: number, recipientIndex: number) => {
    const newRecipients = [...configs[configIndex].recipients];
    newRecipients.splice(recipientIndex, 1);
    updateConfig(configIndex, { recipients: newRecipients });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'mention_spike':
        return <TrendingUp size={18} />;
      case 'first_mention':
        return <AlertCircle size={18} />;
      case 'sentiment_change':
        return <Activity size={18} />;
      default:
        return <Bell size={18} />;
    }
  };

  const getAlertTitle = (type: string) => {
    switch (type) {
      case 'mention_spike':
        return 'Mention Spike Alert';
      case 'first_mention':
        return 'First Mention Alert';
      case 'sentiment_change':
        return 'Sentiment Change Alert';
      default:
        return 'Custom Alert';
    }
  };

  const getAlertDescription = (type: string) => {
    switch (type) {
      case 'mention_spike':
        return 'Get notified when mentions exceed threshold within time window';
      case 'first_mention':
        return 'Get notified when topic is mentioned for the first time in a meeting';
      case 'sentiment_change':
        return 'Get notified when sentiment shifts significantly';
      default:
        return 'Configure custom alert rules';
    }
  };

  return (
    <div className="card-ff">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-s text-white">Alert Configuration</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="button-primary button-small flex items-center gap-2"
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Alert Types */}
      <div className="space-y-6">
        {configs.map((config, index) => (
          <div
            key={config.type}
            className={`p-4 rounded-lg border transition-all ${
              selectedConfig === index
                ? 'bg-white/5 border-[var(--ff-purple-500)]'
                : 'bg-white/[0.02] border-[var(--ff-border)] hover:border-[var(--ff-purple-500)]/50'
            }`}
          >
            {/* Alert Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  config.enabled ? 'bg-[var(--ff-purple-500)]/20' : 'bg-white/10'
                }`}>
                  {getAlertIcon(config.type)}
                </div>
                <div>
                  <h3 className="font-medium text-white">{getAlertTitle(config.type)}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {getAlertDescription(config.type)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateConfig(index, { enabled: !config.enabled })}
                className={`p-2 rounded-lg transition-colors ${
                  config.enabled
                    ? 'bg-[var(--ff-purple-500)] text-white'
                    : 'bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {config.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </button>
            </div>

            {/* Alert Configuration */}
            {selectedConfig === index && (
              <div className="space-y-4 mt-4 pt-4 border-t border-[var(--ff-border)]">
                {/* Threshold */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Threshold
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={config.threshold}
                      onChange={(e) => updateConfig(index, { threshold: Number(e.target.value) })}
                      className="input-ff w-32"
                    />
                    <span className="text-sm text-gray-400">
                      {config.type === 'mention_spike' && 'mentions'}
                      {config.type === 'first_mention' && 'occurrence'}
                      {config.type === 'sentiment_change' && '% change'}
                    </span>
                  </div>
                </div>

                {/* Time Window */}
                {config.type !== 'first_mention' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Time Window
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={config.timeWindow}
                        onChange={(e) => updateConfig(index, { timeWindow: Number(e.target.value) })}
                        className="input-ff w-32"
                      />
                      <span className="text-sm text-gray-400">hours</span>
                    </div>
                  </div>
                )}

                {/* Notification Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Notification Channels
                  </label>
                  <div className="flex gap-3">
                    {['email', 'in_app', 'sms'].map((channel) => (
                      <button
                        key={channel}
                        onClick={() => {
                          const channels = config.channels.includes(channel as any)
                            ? config.channels.filter(c => c !== channel)
                            : [...config.channels, channel as any];
                          updateConfig(index, { channels });
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          config.channels.includes(channel as any)
                            ? 'bg-[var(--ff-purple-500)] text-white'
                            : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {channel === 'email' && <Mail size={14} />}
                        {channel === 'in_app' && <Bell size={14} />}
                        {channel === 'sms' && <Smartphone size={14} />}
                        {channel === 'email' ? 'Email' : channel === 'in_app' ? 'In-App' : 'SMS'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Recipients
                  </label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Enter email address"
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addRecipient(index)}
                        className="input-ff flex-1"
                      />
                      <button
                        onClick={() => addRecipient(index)}
                        className="button-secondary button-small"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {config.recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {config.recipients.map((recipient, rIndex) => (
                          <span
                            key={rIndex}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm"
                          >
                            {recipient}
                            <button
                              onClick={() => removeRecipient(index, rIndex)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Expand/Collapse Button */}
            {selectedConfig !== index && (
              <button
                onClick={() => setSelectedConfig(index)}
                className="mt-3 text-sm text-[var(--ff-purple-500)] hover:text-[var(--ff-purple-400)] transition-colors"
              >
                Configure →
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Alert History */}
      <div className="mt-8 pt-8 border-t border-[var(--ff-border)]">
        <h3 className="font-medium text-white mb-4">Recent Alerts</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--ff-purple-500)]"></div>
          </div>
        ) : alertHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No alerts triggered yet</p>
        ) : (
          <div className="space-y-2">
            {alertHistory.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
              >
                <div className={`p-1.5 rounded ${
                  alert.triggered ? 'bg-[var(--ff-purple-500)]/20' : 'bg-white/10'
                }`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {alert.triggered && (
                  <span className="text-xs px-2 py-1 bg-[var(--ff-purple-500)]/20 text-[var(--ff-purple-400)] rounded">
                    Triggered
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}