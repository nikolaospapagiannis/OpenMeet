'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User, Bell, Lock, CreditCard, Users, Zap, Globe,
  Shield, Mail, ChevronRight, Settings, Palette, Key
} from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';

// Import all the new components
import { AvatarUploader } from '@/components/settings/AvatarUploader';
import { ProfileForm } from '@/components/settings/ProfileForm';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { TimezoneSelector } from '@/components/settings/TimezoneSelector';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { AccountDeletion } from '@/components/settings/AccountDeletion';
import { useProfileSettings } from '@/hooks/useProfileSettings';

// Tab type definition
type SettingsTab = 'profile' | 'notifications' | 'preferences' | 'security';

export default function EnhancedSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [userId, setUserId] = useState<string>('user-123'); // In production, get from auth

  const {
    profile,
    loading,
    error,
    updateProfile,
    updateAvatar,
    updatePreferences,
    deleteAccount,
  } = useProfileSettings(userId);

  // Settings sections for quick navigation
  const settingsSections = [
    {
      title: 'Team Management',
      description: 'Invite and manage team members',
      icon: Users,
      href: '/settings/team',
      color: 'teal',
    },
    {
      title: 'Billing & Plans',
      description: 'Manage subscription and payment methods',
      icon: CreditCard,
      href: '/settings/billing',
      color: 'green',
    },
    {
      title: 'Security',
      description: 'Two-factor auth and security settings',
      icon: Shield,
      href: '/settings/security',
      color: 'purple',
    },
    {
      title: 'Integrations',
      description: 'Connect third-party apps and services',
      icon: Zap,
      href: '/integrations',
      color: 'pink',
    },
  ];

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile', icon: User },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'preferences' as SettingsTab, label: 'Preferences', icon: Settings },
    { id: 'security' as SettingsTab, label: 'Security', icon: Lock },
  ];

  const handleAvatarUpload = async (avatarUrl: string) => {
    await updateAvatar(avatarUrl);
  };

  const handleProfileSave = async (data: any) => {
    await updateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      preferences: {
        ...profile?.preferences,
        social: {
          linkedIn: data.linkedIn,
          twitter: data.twitter,
          website: data.website,
        },
      },
    });
  };

  const handleNotificationsSave = async (preferences: any) => {
    await updatePreferences({
      notifications: preferences,
    });
  };

  const handleTimezoneChange = async (timezone: string) => {
    await updatePreferences({ timezone });
  };

  const handleLanguageChange = async (language: string) => {
    await updatePreferences({ language });
  };

  const handleAccountDelete = async () => {
    // Redirect to login or homepage after account deletion
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-white">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">
            Manage your account preferences and configuration
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.title} href={section.href}>
                <CardGlass variant="default" hover className="h-full">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${section.color}-500 to-${section.color}-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-${section.color}-500/20`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-sm">{section.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{section.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
                  </div>
                </CardGlass>
              </Link>
            );
          })}
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-1 p-1 bg-slate-800/30 rounded-xl mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <AvatarUploader
                currentAvatar={profile?.avatarUrl}
                userId={userId}
                onUploadComplete={handleAvatarUpload}
              />

              <ProfileForm
                userId={userId}
                initialData={{
                  firstName: profile?.firstName,
                  lastName: profile?.lastName,
                  email: profile?.email,
                  phone: profile?.preferences?.social?.linkedIn,
                  jobTitle: profile?.jobTitle,
                  company: profile?.company,
                  location: profile?.location,
                  bio: profile?.bio,
                  linkedIn: profile?.preferences?.social?.linkedIn,
                  twitter: profile?.preferences?.social?.twitter,
                  website: profile?.preferences?.social?.website,
                }}
                onSave={handleProfileSave}
              />
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <NotificationPreferences
              userId={userId}
              onSave={handleNotificationsSave}
            />
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <>
              <TimezoneSelector
                currentTimezone={profile?.preferences?.timezone}
                userId={userId}
                onTimezoneChange={handleTimezoneChange}
              />

              <LanguageSelector
                currentLanguage={profile?.preferences?.language}
                userId={userId}
                onLanguageChange={handleLanguageChange}
              />

              {/* Theme Settings */}
              <CardGlass variant="default" className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Palette className="w-5 h-5 text-pink-400" />
                  <h3 className="text-lg font-semibold text-white">Appearance</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['light', 'dark', 'system'].map((theme) => (
                        <button
                          key={theme}
                          className={`p-3 rounded-xl border transition-all ${
                            profile?.preferences?.theme === theme
                              ? 'bg-pink-500/20 border-pink-500/30 text-pink-300'
                              : 'bg-slate-800/30 border-white/5 text-slate-400 hover:border-white/10'
                          }`}
                          onClick={() => updatePreferences({ theme: theme as any })}
                        >
                          <div className="text-sm font-medium capitalize">{theme}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Date Format
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-pink-500/50 outline-none"
                        value={profile?.preferences?.dateFormat || 'MM/DD/YYYY'}
                        onChange={(e) => updatePreferences({ dateFormat: e.target.value })}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Time Format
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-pink-500/50 outline-none"
                        value={profile?.preferences?.timeFormat || '12h'}
                        onChange={(e) => updatePreferences({ timeFormat: e.target.value as any })}
                      >
                        <option value="12h">12-hour (AM/PM)</option>
                        <option value="24h">24-hour</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardGlass>
            </>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              {/* Password Change */}
              <CardGlass variant="default" className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Key className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">Password & Authentication</h3>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Password</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Last changed 30 days ago
                        </p>
                      </div>
                      <Link href="/settings/security">
                        <Button variant="ghost-glass" size="sm">
                          Change Password
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Two-Factor Authentication</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {profile?.mfaEnabled ? 'Enabled' : 'Add an extra layer of security'}
                        </p>
                      </div>
                      {profile?.mfaEnabled ? (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                          Enabled
                        </Badge>
                      ) : (
                        <Link href="/settings/security">
                          <Button variant="ghost-glass" size="sm">
                            Enable
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-200">Active Sessions</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          3 devices currently signed in
                        </p>
                      </div>
                      <Link href="/settings/security">
                        <Button variant="ghost-glass" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardGlass>

              {/* Account Deletion */}
              <AccountDeletion
                userId={userId}
                userEmail={profile?.email || ''}
                onDeleteComplete={handleAccountDelete}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}