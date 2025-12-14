'use client';

import { useState } from 'react';
import { Mail, Clock, RefreshCw, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { CardGlass } from '@/components/ui/card-glass';
import { TeamInvite } from '@/hooks/useTeamManagement';

interface PendingInvitesProps {
  invites: TeamInvite[];
  onResend: (inviteId: string) => Promise<any>;
  onRevoke: (inviteId: string) => Promise<any>;
}

export function PendingInvites({ invites, onResend, onRevoke }: PendingInvitesProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResend = async (inviteId: string) => {
    setProcessingId(inviteId);
    try {
      await onResend(inviteId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    setProcessingId(inviteId);
    try {
      await onRevoke(inviteId);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`;
    return `${hours} hour${hours > 1 ? 's' : ''} remaining`;
  };

  const getRoleBadgeClass = (role: string) => {
    const badges: Record<string, string> = {
      super_admin: 'bg-red-500/20 text-red-300 border-red-500/30',
      admin: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      user: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return badges[role] || badges.user;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      user: 'Member',
    };
    return labels[role] || 'Member';
  };

  if (invites.length === 0) {
    return (
      <CardGlass variant="default" hover>
        <div className="p-8 text-center">
          <Mail className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            No Pending Invitations
          </h3>
          <p className="text-sm text-slate-500">
            All team invitations have been accepted or expired
          </p>
        </div>
      </CardGlass>
    );
  }

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-semibold text-white">Pending Invitations</h2>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
            {invites.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {invites.map((invite) => {
          const isProcessing = processingId === invite.id;
          const timeRemaining = getTimeRemaining(invite.expiresAt);
          const isExpired = timeRemaining === 'Expired';

          return (
            <div
              key={invite.id}
              className={`
                flex items-center justify-between p-4 rounded-xl
                bg-slate-800/30 border border-white/5
                hover:bg-slate-800/50 hover:border-white/10
                transition-all ${isExpired ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-700/50 border border-white/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{invite.email}</span>
                    <Badge className={getRoleBadgeClass(invite.role)}>
                      {getRoleLabel(invite.role)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      Invited by {invite.invitedBy.firstName || invite.invitedBy.email}
                    </span>
                    <span>•</span>
                    <span>{formatDate(invite.createdAt)}</span>
                    <span>•</span>
                    <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : ''}`}>
                      <Clock className="w-3 h-3" />
                      {timeRemaining}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost-glass"
                  size="sm"
                  onClick={() => handleResend(invite.id)}
                  disabled={isProcessing || isExpired}
                  title={isExpired ? 'Cannot resend expired invitation' : 'Resend invitation'}
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost-glass"
                  size="sm"
                  className="text-rose-400 hover:text-rose-300"
                  onClick={() => handleRevoke(invite.id)}
                  disabled={isProcessing}
                  title="Revoke invitation"
                >
                  {isProcessing ? (
                    <X className="w-4 h-4 animate-pulse" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {invites.some(i => getTimeRemaining(i.expiresAt) === 'Expired') && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-300">
            Some invitations have expired. You can resend them to extend the expiration date.
          </p>
        </div>
      )}
    </CardGlass>
  );
}