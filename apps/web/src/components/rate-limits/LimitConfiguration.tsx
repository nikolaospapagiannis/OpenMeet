/**
 * LimitConfiguration Component
 * Configure rate limits per user/team with different tiers
 */

'use client';

import React, { useState } from 'react';
import { Settings, Users, Shield, TrendingUp, Save, RefreshCw } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface RateLimitTier {
  id: string;
  name: string;
  apiCallsPerHour: number;
  apiCallsPerDay: number;
  storageGB: number;
  transcriptionMinutes: number;
  maxTeamMembers: number;
  price: number;
  features: string[];
}

export interface LimitConfigurationProps {
  currentTier?: RateLimitTier;
  tiers?: RateLimitTier[];
  onTierChange?: (tierId: string) => void;
  onSave?: (config: LimitConfig) => void;
  className?: string;
}

interface LimitConfig {
  tierId: string;
  customLimits: {
    apiCallsPerHour?: number;
    apiCallsPerDay?: number;
    storageGB?: number;
    transcriptionMinutes?: number;
  };
  settings: {
    autoUpgrade: boolean;
    alertOnLimit: boolean;
    blockOnLimit: boolean;
    burstAllowed: boolean;
    customQuotas: boolean;
  };
}

const defaultTiers: RateLimitTier[] = [
  {
    id: 'free',
    name: 'Free',
    apiCallsPerHour: 100,
    apiCallsPerDay: 1000,
    storageGB: 5,
    transcriptionMinutes: 60,
    maxTeamMembers: 3,
    price: 0,
    features: ['Basic rate limits', 'Email alerts', 'Community support'],
  },
  {
    id: 'starter',
    name: 'Starter',
    apiCallsPerHour: 1000,
    apiCallsPerDay: 20000,
    storageGB: 50,
    transcriptionMinutes: 500,
    maxTeamMembers: 10,
    price: 29,
    features: ['Higher limits', 'Priority support', 'Custom alerts', 'API analytics'],
  },
  {
    id: 'pro',
    name: 'Professional',
    apiCallsPerHour: 5000,
    apiCallsPerDay: 100000,
    storageGB: 200,
    transcriptionMinutes: 2000,
    maxTeamMembers: 50,
    price: 99,
    features: ['Advanced limits', 'Custom quotas', 'Burst mode', 'SLA guarantee'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    apiCallsPerHour: -1, // Unlimited
    apiCallsPerDay: -1,
    storageGB: 1000,
    transcriptionMinutes: 10000,
    maxTeamMembers: -1,
    price: -1, // Custom pricing
    features: ['Unlimited API calls', 'Custom limits', 'Dedicated support', 'Custom SLA'],
  },
];

export function LimitConfiguration({
  currentTier = defaultTiers[0],
  tiers = defaultTiers,
  onTierChange,
  onSave,
  className,
}: LimitConfigurationProps) {
  const [selectedTierId, setSelectedTierId] = useState(currentTier.id);
  const [customLimits, setCustomLimits] = useState({
    apiCallsPerHour: currentTier.apiCallsPerHour,
    apiCallsPerDay: currentTier.apiCallsPerDay,
    storageGB: currentTier.storageGB,
    transcriptionMinutes: currentTier.transcriptionMinutes,
  });
  const [settings, setSettings] = useState({
    autoUpgrade: false,
    alertOnLimit: true,
    blockOnLimit: false,
    burstAllowed: false,
    customQuotas: false,
  });

  const selectedTier = tiers.find(t => t.id === selectedTierId) || currentTier;
  const isCustomQuotasEnabled = settings.customQuotas && selectedTier.id !== 'free';

  const handleTierSelect = (tierId: string) => {
    setSelectedTierId(tierId);
    const tier = tiers.find(t => t.id === tierId);
    if (tier) {
      setCustomLimits({
        apiCallsPerHour: tier.apiCallsPerHour,
        apiCallsPerDay: tier.apiCallsPerDay,
        storageGB: tier.storageGB,
        transcriptionMinutes: tier.transcriptionMinutes,
      });
    }
    onTierChange?.(tierId);
  };

  const handleSave = () => {
    onSave?.({
      tierId: selectedTierId,
      customLimits: isCustomQuotasEnabled ? customLimits : {},
      settings,
    });
  };

  const formatLimit = (value: number, unit?: string) => {
    if (value === -1) return 'Unlimited';
    if (unit === 'GB') return `${value} GB`;
    if (unit === 'min') return `${value.toLocaleString()} min`;
    return value.toLocaleString();
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Tier Selection */}
      <CardGlass variant="default" hover>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-teal-400" />
            <h3 className="text-xl font-semibold text-white">Select Plan</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers.map((tier) => {
              const isSelected = tier.id === selectedTierId;
              const isCurrent = tier.id === currentTier.id;

              return (
                <div
                  key={tier.id}
                  className={cn(
                    'relative p-4 rounded-xl border-2 transition-all cursor-pointer',
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500 shadow-lg shadow-teal-500/20'
                      : 'bg-slate-800/30 border-white/10 hover:border-white/20'
                  )}
                  onClick={() => handleTierSelect(tier.id)}
                >
                  {isCurrent && (
                    <Badge className="absolute -top-2 -right-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                      Current
                    </Badge>
                  )}

                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-white">{tier.name}</h4>
                    <p className="text-2xl font-bold text-teal-400 mt-2">
                      {tier.price === -1 ? 'Custom' : tier.price === 0 ? 'Free' : `$${tier.price}/mo`}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">API/Hour</span>
                      <span className="text-slate-200 font-medium">
                        {formatLimit(tier.apiCallsPerHour)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">API/Day</span>
                      <span className="text-slate-200 font-medium">
                        {formatLimit(tier.apiCallsPerDay)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage</span>
                      <span className="text-slate-200 font-medium">
                        {formatLimit(tier.storageGB, 'GB')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transcription</span>
                      <span className="text-slate-200 font-medium">
                        {formatLimit(tier.transcriptionMinutes, 'min')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Team Size</span>
                      <span className="text-slate-200 font-medium">
                        {tier.maxTeamMembers === -1 ? 'Unlimited' : tier.maxTeamMembers}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    {tier.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="text-xs text-slate-400 mt-1">
                        • {feature}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardGlass>

      {/* Custom Limits */}
      {selectedTier.id !== 'free' && (
        <CardGlass variant="default" hover>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-semibold text-white">Custom Limits</h3>
              </div>
              <Switch
                checked={settings.customQuotas}
                onCheckedChange={(checked) => setSettings({ ...settings, customQuotas: checked })}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>

            {isCustomQuotasEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Calls per Hour
                  </label>
                  <input
                    type="number"
                    value={customLimits.apiCallsPerHour}
                    onChange={(e) => setCustomLimits({
                      ...customLimits,
                      apiCallsPerHour: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Calls per Day
                  </label>
                  <input
                    type="number"
                    value={customLimits.apiCallsPerDay}
                    onChange={(e) => setCustomLimits({
                      ...customLimits,
                      apiCallsPerDay: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Storage (GB)
                  </label>
                  <input
                    type="number"
                    value={customLimits.storageGB}
                    onChange={(e) => setCustomLimits({
                      ...customLimits,
                      storageGB: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Transcription Minutes
                  </label>
                  <input
                    type="number"
                    value={customLimits.transcriptionMinutes}
                    onChange={(e) => setCustomLimits({
                      ...customLimits,
                      transcriptionMinutes: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </CardGlass>
      )}

      {/* Settings */}
      <CardGlass variant="default" hover>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">Limit Behavior</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/10">
              <div>
                <div className="text-sm font-medium text-slate-200">Auto-upgrade Plan</div>
                <div className="text-xs text-slate-500 mt-1">
                  Automatically upgrade when limits are reached
                </div>
              </div>
              <Switch
                checked={settings.autoUpgrade}
                onCheckedChange={(checked) => setSettings({ ...settings, autoUpgrade: checked })}
                className="data-[state=checked]:bg-teal-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/10">
              <div>
                <div className="text-sm font-medium text-slate-200">Alert on Limit</div>
                <div className="text-xs text-slate-500 mt-1">
                  Send notifications when approaching limits
                </div>
              </div>
              <Switch
                checked={settings.alertOnLimit}
                onCheckedChange={(checked) => setSettings({ ...settings, alertOnLimit: checked })}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/10">
              <div>
                <div className="text-sm font-medium text-slate-200">Block on Limit</div>
                <div className="text-xs text-slate-500 mt-1">
                  Block requests when limit is exceeded
                </div>
              </div>
              <Switch
                checked={settings.blockOnLimit}
                onCheckedChange={(checked) => setSettings({ ...settings, blockOnLimit: checked })}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/10">
              <div>
                <div className="text-sm font-medium text-slate-200">Allow Burst Mode</div>
                <div className="text-xs text-slate-500 mt-1">
                  Allow temporary burst above normal limits
                </div>
              </div>
              <Switch
                checked={settings.burstAllowed}
                onCheckedChange={(checked) => setSettings({ ...settings, burstAllowed: checked })}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-white/10">
            <Button variant="ghost-glass" size="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="gradient-primary" size="default" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
      </CardGlass>
    </div>
  );
}