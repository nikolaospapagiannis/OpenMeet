'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Calendar, Users, TrendingUp, Zap, Shield, Clock, Check } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: any;
}

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  channels: {
    email: boolean;
    inApp: boolean;
    push: boolean;
    slack: boolean;
  };
  frequency?: 'realtime' | 'daily' | 'weekly' | 'never';
}

interface NotificationPreferencesProps {
  userId: string;
  onSave?: (preferences: any) => void;
}

export function NotificationPreferences({ userId, onSave }: NotificationPreferencesProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');

  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'email',
      label: 'Email',
      description: 'Receive notifications via email',
      enabled: true,
      icon: Mail,
    },
    {
      id: 'inApp',
      label: 'In-App',
      description: 'Show notifications in the application',
      enabled: true,
      icon: Bell,
    },
    {
      id: 'push',
      label: 'Push Notifications',
      description: 'Browser push notifications',
      enabled: false,
      icon: MessageSquare,
    },
    {
      id: 'slack',
      label: 'Slack',
      description: 'Send notifications to Slack',
      enabled: false,
      icon: Zap,
    },
  ]);

  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'meetings',
      title: 'Meetings & Events',
      description: 'New meetings, reminders, and schedule changes',
      icon: Calendar,
      color: 'teal',
      channels: { email: true, inApp: true, push: true, slack: false },
      frequency: 'realtime',
    },
    {
      id: 'team',
      title: 'Team Activity',
      description: 'Team member actions, joins, and mentions',
      icon: Users,
      color: 'purple',
      channels: { email: true, inApp: true, push: false, slack: true },
      frequency: 'realtime',
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      description: 'Weekly summaries and performance reports',
      icon: TrendingUp,
      color: 'cyan',
      channels: { email: true, inApp: false, push: false, slack: false },
      frequency: 'weekly',
    },
    {
      id: 'system',
      title: 'System Updates',
      description: 'Security alerts, maintenance, and updates',
      icon: Shield,
      color: 'amber',
      channels: { email: true, inApp: true, push: true, slack: false },
      frequency: 'realtime',
    },
  ]);

  const toggleChannel = (channelId: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
      )
    );
  };

  const toggleCategoryChannel = (categoryId: string, channel: keyof NotificationCategory['channels']) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              channels: {
                ...cat.channels,
                [channel]: !cat.channels[channel],
              },
            }
          : cat
      )
    );
  };

  const updateCategoryFrequency = (categoryId: string, frequency: NotificationCategory['frequency']) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, frequency } : cat
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const preferences = {
        channels: channels.reduce((acc, ch) => ({
          ...acc,
          [ch.id]: ch.enabled,
        }), {}),
        categories: categories.map(cat => ({
          id: cat.id,
          channels: cat.channels,
          frequency: cat.frequency,
        })),
        digestFrequency,
        quietHours: {
          enabled: quietHoursEnabled,
          start: quietHoursStart,
          end: quietHoursEnd,
        },
      };

      const response = await fetch('/api/users/me/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSaveSuccess(true);

      if (onSave) {
        onSave(preferences);
      }

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getActiveChannelCount = () => {
    return channels.filter(ch => ch.enabled).length;
  };

  const getActiveCategoryCount = () => {
    return categories.filter(cat =>
      Object.values(cat.channels).some(enabled => enabled)
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <CardGlass variant="default" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Notification Channels</h3>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {getActiveChannelCount()} Active
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {channels.map(channel => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-200">{channel.label}</div>
                    <div className="text-xs text-slate-500">{channel.description}</div>
                  </div>
                </div>
                <Switch
                  checked={channel.enabled}
                  onCheckedChange={() => toggleChannel(channel.id)}
                  className="data-[state=checked]:bg-purple-500"
                />
              </div>
            );
          })}
        </div>
      </CardGlass>

      {/* Notification Categories */}
      <CardGlass variant="default" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Notification Categories</h3>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {getActiveCategoryCount()} Active
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="p-4 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-${category.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 text-${category.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white">{category.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">{category.description}</p>
                  </div>
                  <select
                    value={category.frequency}
                    onChange={(e) =>
                      updateCategoryFrequency(category.id, e.target.value as NotificationCategory['frequency'])
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-xs text-white focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {Object.entries(category.channels).map(([channel, enabled]) => (
                    <button
                      key={channel}
                      onClick={() => toggleCategoryChannel(category.id, channel as keyof NotificationCategory['channels'])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        enabled
                          ? `bg-${category.color}-500/20 text-${category.color}-300 border border-${category.color}-500/30`
                          : 'bg-slate-800/50 text-slate-500 border border-white/5 hover:border-white/10'
                      }`}
                    >
                      {channel.charAt(0).toUpperCase() + channel.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardGlass>

      {/* Email Digest Settings */}
      <CardGlass variant="default" className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">Email Digest</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Digest Frequency
            </label>
            <select
              value={digestFrequency}
              onChange={(e) => setDigestFrequency(e.target.value as typeof digestFrequency)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-amber-500/50 outline-none"
            >
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Summary</option>
            </select>
            <p className="text-xs text-slate-500 mt-2">
              Receive a summary of all your notifications at the selected interval
            </p>
          </div>
        </div>
      </CardGlass>

      {/* Quiet Hours */}
      <CardGlass variant="default" className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-rose-400" />
          <h3 className="text-lg font-semibold text-white">Quiet Hours</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/5">
            <div>
              <div className="text-sm font-medium text-slate-200">Enable Quiet Hours</div>
              <div className="text-xs text-slate-500 mt-1">
                Pause notifications during specific hours
              </div>
            </div>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>

          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-rose-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-rose-500/50 outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </CardGlass>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="gradient-primary"
          size="default"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            'Saving...'
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Saved
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
}