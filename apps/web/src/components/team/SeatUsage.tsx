'use client';

import { Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button-v2';
import { SeatUsage as SeatUsageType } from '@/hooks/useTeamManagement';

interface SeatUsageProps {
  seatUsage: SeatUsageType | null;
  onUpgrade?: () => void;
}

export function SeatUsage({ seatUsage, onUpgrade }: SeatUsageProps) {
  if (!seatUsage) {
    return (
      <CardGlass variant="default" hover>
        <div className="animate-pulse">
          <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
          <div className="h-8 bg-slate-700 rounded w-32"></div>
        </div>
      </CardGlass>
    );
  }

  const getStatusIcon = () => {
    switch (seatUsage.usage.status) {
      case 'full':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
  };

  const getStatusColor = () => {
    switch (seatUsage.usage.status) {
      case 'full':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
  };

  const getProgressColor = () => {
    switch (seatUsage.usage.status) {
      case 'full':
        return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'warning':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      default:
        return 'bg-gradient-to-r from-teal-500 to-cyan-500';
    }
  };

  const isPlatformOwner = seatUsage.tier === 'platform-owner' || (seatUsage as any).isPlatformOwner;

  const getTierBadgeColor = () => {
    if (isPlatformOwner) {
      return 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30';
    }
    const colors: Record<string, string> = {
      free: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      pro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      business: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      enterprise: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30',
    };
    return colors[seatUsage.tier] || colors.free;
  };

  const formatTierName = (tier: string) => {
    if (tier === 'platform-owner' || isPlatformOwner) return 'Platform Owner';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  return (
    <CardGlass variant="elevated" gradient>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Seat Usage</h3>
        </div>
        <Badge className={getTierBadgeColor()}>
          {isPlatformOwner ? 'Platform Owner' : `${formatTierName(seatUsage.tier)} Plan`}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Active Seats</span>
            <span className="text-sm font-medium text-white">
              {seatUsage.usedSeats} / {isPlatformOwner || seatUsage.maxSeats === -1 ? '∞' : seatUsage.maxSeats}
            </span>
          </div>
          {!isPlatformOwner && seatUsage.maxSeats !== -1 && (
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor()}`}
                style={{ width: `${Math.min(100, seatUsage.usage.percentage)}%` }}
              />
            </div>
          )}
          {isPlatformOwner && (
            <div className="text-xs text-purple-400 mt-1">Unlimited seats available</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Available Seats</p>
            <p className="text-2xl font-bold text-white">
              {isPlatformOwner || seatUsage.availableSeats === -1 ? '∞' : seatUsage.availableSeats}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400">Pending Invites</p>
            <p className="text-2xl font-bold text-amber-400">{seatUsage.pendingInvites}</p>
          </div>
        </div>

        {seatUsage.inactiveUsers > 0 && (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-slate-300">
                  {seatUsage.inactiveUsers} inactive user{seatUsage.inactiveUsers !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Consider removing inactive users to free up seats
                </p>
              </div>
            </div>
          </div>
        )}

        {seatUsage.usage.status !== 'ok' && (
          <div className={`p-3 rounded-lg border ${getStatusColor()}`}>
            <div className="flex items-start gap-2">
              {getStatusIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {seatUsage.usage.status === 'full' ? 'Seat Limit Reached' : 'Approaching Limit'}
                </p>
                <p className="text-xs mt-1 opacity-80">
                  {seatUsage.usage.status === 'full'
                    ? "You've reached your maximum seat allocation"
                    : `You're using ${seatUsage.usage.percentage}% of your available seats`}
                </p>
              </div>
            </div>
          </div>
        )}

        {(seatUsage.usage.status === 'full' || seatUsage.usage.status === 'warning') && onUpgrade && (
          <Button
            variant="gradient-primary"
            size="default"
            className="w-full"
            onClick={onUpgrade}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        )}
      </div>
    </CardGlass>
  );
}