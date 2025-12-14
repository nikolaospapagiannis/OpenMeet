'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, Slack, MessageSquare, Globe, Plus, X, Settings, TestTube, Save, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'in-app';
  name: string;
  config: {
    endpoint?: string;
    recipients?: string[];
    channel?: string;
    webhookUrl?: string;
  };
  enabled: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

interface AlertCondition {
  id: string;
  type: 'threshold' | 'trend' | 'sentiment' | 'time' | 'speaker';
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'changes';
  value: any;
  timeWindow?: string;
}

interface AlertAction {
  channelId: string;
  template: string;
  cooldown: number; // minutes
}

interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  timestamp: Date;
  channel: string;
  status: 'sent' | 'failed' | 'pending';
  message: string;
}

interface TopicAlertsProps {
  topicId: string;
  topicName: string;
  onSave?: (rules: AlertRule[]) => void;
  onTest?: (rule: AlertRule) => void;
}

export default function TopicAlerts({
  topicId,
  topicName,
  onSave,
  onTest
}: TopicAlertsProps) {
  const [channels, setChannels] = useState<AlertChannel[]>([
    {
      id: '1',
      type: 'email',
      name: 'Team Email',
      config: { recipients: ['team@company.com'] },
      enabled: true
    },
    {
      id: '2',
      type: 'slack',
      name: 'Sales Channel',
      config: { channel: '#sales-alerts' },
      enabled: true
    }
  ]);

  const [rules, setRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'High Mention Alert',
      description: 'Alert when topic mentions exceed threshold',
      conditions: [{
        id: '1',
        type: 'threshold',
        operator: 'gt',
        value: 10,
        timeWindow: '1h'
      }],
      actions: [{
        channelId: '1',
        template: 'Topic "{topic}" mentioned {count} times in the last hour',
        cooldown: 60
      }],
      enabled: true,
      triggerCount: 5,
      lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  ]);

  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'channels' | 'history'>('rules');
  const [testResult, setTestResult] = useState<{ ruleId: string; success: boolean; message: string } | null>(null);

  // Load alert history
  useEffect(() => {
    const mockHistory: AlertHistory[] = Array(10).fill(null).map((_, i) => ({
      id: `history-${i}`,
      ruleId: '1',
      ruleName: 'High Mention Alert',
      timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
      channel: ['Email', 'Slack'][Math.floor(Math.random() * 2)],
      status: ['sent', 'failed', 'pending'][Math.floor(Math.random() * 3)] as any,
      message: `Topic "${topicName}" mentioned ${Math.floor(Math.random() * 20) + 10} times`
    }));
    setHistory(mockHistory);
  }, [topicName]);

  const addRule = () => {
    const newRule: AlertRule = {
      id: Date.now().toString(),
      name: 'New Alert Rule',
      description: '',
      conditions: [{
        id: '1',
        type: 'threshold',
        operator: 'gt',
        value: 5,
        timeWindow: '1h'
      }],
      actions: [{
        channelId: channels[0]?.id || '',
        template: 'Alert triggered for {topic}',
        cooldown: 30
      }],
      enabled: false,
      triggerCount: 0
    };
    setEditingRule(newRule);
  };

  const saveRule = (rule: AlertRule) => {
    if (rules.find(r => r.id === rule.id)) {
      setRules(rules.map(r => r.id === rule.id ? rule : r));
    } else {
      setRules([...rules, rule]);
    }
    setEditingRule(null);
    onSave?.(rules);
  };

  const deleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const testRule = async (rule: AlertRule) => {
    setTestResult({ ruleId: rule.id, success: false, message: 'Testing...' });

    // Simulate test
    setTimeout(() => {
      const success = Math.random() > 0.3;
      setTestResult({
        ruleId: rule.id,
        success,
        message: success ? 'Test alert sent successfully!' : 'Failed to send test alert'
      });
    }, 1500);

    onTest?.(rule);
  };

  const addChannel = (channel: Omit<AlertChannel, 'id'>) => {
    const newChannel: AlertChannel = {
      ...channel,
      id: Date.now().toString()
    };
    setChannels([...channels, newChannel]);
    setShowChannelModal(false);
  };

  const deleteChannel = (channelId: string) => {
    setChannels(channels.filter(c => c.id !== channelId));
    // Remove channel from rules
    setRules(rules.map(r => ({
      ...r,
      actions: r.actions.filter(a => a.channelId !== channelId)
    })));
  };

  return (
    <div className="topic-alerts">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg mb-6 inline-flex">
        {(['rules', 'channels', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded capitalize transition-colors ${
              activeTab === tab
                ? 'bg-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-white">Alert Rules</h3>
            <button
              onClick={addRule}
              className="button-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Rule
            </button>
          </div>

          {rules.map(rule => (
            <div key={rule.id} className="card-ff">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-white">{rule.name}</h4>
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`p-1 rounded transition-colors ${
                        rule.enabled ? 'text-green-400 bg-green-400/20' : 'text-gray-400 bg-white/5'
                      }`}
                    >
                      {rule.enabled ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{rule.description}</p>

                  {/* Conditions */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">CONDITIONS</p>
                    <div className="space-y-1">
                      {rule.conditions.map(condition => (
                        <div key={condition.id} className="text-sm bg-white/5 rounded px-3 py-2">
                          <span className="text-purple-400">{condition.type}</span>
                          <span className="text-gray-400 mx-2">{condition.operator}</span>
                          <span className="text-white">{condition.value}</span>
                          {condition.timeWindow && (
                            <span className="text-gray-400 ml-2">within {condition.timeWindow}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">ACTIONS</p>
                    <div className="space-y-1">
                      {rule.actions.map((action, index) => {
                        const channel = channels.find(c => c.id === action.channelId);
                        return (
                          <div key={index} className="text-sm bg-white/5 rounded px-3 py-2">
                            <span className="text-blue-400">{channel?.name || 'Unknown'}</span>
                            <span className="text-gray-400 ml-2">
                              (cooldown: {action.cooldown}min)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Triggered {rule.triggerCount} times</span>
                    {rule.lastTriggered && (
                      <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testRule(rule)}
                    className="button-secondary text-sm flex items-center gap-1"
                  >
                    <TestTube size={14} />
                    Test
                  </button>
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="button-secondary text-sm"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {testResult?.ruleId === rule.id && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                  testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-white">Notification Channels</h3>
            <button
              onClick={() => setShowChannelModal(true)}
              className="button-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Add Channel
            </button>
          </div>

          {channels.map(channel => (
            <div key={channel.id} className="card-ff flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  channel.type === 'email' ? 'bg-blue-500/20' :
                  channel.type === 'slack' ? 'bg-purple-500/20' :
                  channel.type === 'webhook' ? 'bg-orange-500/20' :
                  'bg-gray-500/20'
                }`}>
                  {channel.type === 'email' ? <Mail size={20} className="text-blue-400" /> :
                   channel.type === 'slack' ? <Slack size={20} className="text-purple-400" /> :
                   channel.type === 'webhook' ? <Globe size={20} className="text-orange-400" /> :
                   <MessageSquare size={20} className="text-gray-400" />}
                </div>
                <div>
                  <h4 className="font-medium text-white">{channel.name}</h4>
                  <p className="text-sm text-gray-400">
                    {channel.type === 'email' && channel.config.recipients?.join(', ')}
                    {channel.type === 'slack' && channel.config.channel}
                    {channel.type === 'webhook' && channel.config.webhookUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChannels(channels.map(c =>
                    c.id === channel.id ? { ...c, enabled: !c.enabled } : c
                  ))}
                  className={`p-2 rounded transition-colors ${
                    channel.enabled ? 'text-green-400 bg-green-400/20' : 'text-gray-400 bg-white/5'
                  }`}
                >
                  {channel.enabled ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
                <button
                  onClick={() => deleteChannel(channel.id)}
                  className="text-gray-400 hover:text-red-400 p-2"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="font-medium text-white mb-4">Alert History</h3>

          <div className="space-y-2">
            {history.map(item => (
              <div key={item.id} className="card-ff flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'sent' ? 'bg-green-400' :
                    item.status === 'failed' ? 'bg-red-400' :
                    'bg-yellow-400'
                  }`} />
                  <div>
                    <p className="text-sm text-white">{item.message}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{item.ruleName}</span>
                      <span className="text-xs text-gray-400">→ {item.channel}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`text-xs px-2 py-1 rounded ${
                  item.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                  item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="heading-m text-white mb-4">
              {rules.find(r => r.id === editingRule.id) ? 'Edit' : 'Create'} Alert Rule
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Rule Name</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Description</label>
                <textarea
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                />
              </div>

              {/* Add more condition/action editors here */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingRule(null)}
                className="button-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => saveRule(editingRule)}
                className="button-primary flex items-center gap-2"
              >
                <Save size={16} />
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h3 className="heading-m text-white mb-4">Add Notification Channel</h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const type = formData.get('type') as any;
              const name = formData.get('name') as string;
              const config: any = {};

              if (type === 'email') {
                config.recipients = (formData.get('recipients') as string).split(',').map(r => r.trim());
              } else if (type === 'slack') {
                config.channel = formData.get('channel') as string;
              } else if (type === 'webhook') {
                config.webhookUrl = formData.get('webhookUrl') as string;
              }

              addChannel({ type, name, config, enabled: true });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Channel Type</label>
                  <select name="type" className="input-field w-full" required>
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                    <option value="webhook">Webhook</option>
                    <option value="in-app">In-App</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Channel Name</label>
                  <input
                    type="text"
                    name="name"
                    className="input-field w-full"
                    required
                  />
                </div>

                {/* Dynamic fields based on type */}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowChannelModal(false)}
                  className="button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="button-primary">
                  Add Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}