'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Calendar, User, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { CardGlass } from '@/components/ui/card-glass';
import { TeamActivity } from '@/hooks/useTeamManagement';

interface TeamActivityLogProps {
  fetchActivityLog: (params?: any) => Promise<any>;
}

export function TeamActivityLog({ fetchActivityLog }: TeamActivityLogProps) {
  const [activities, setActivities] = useState<TeamActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [page, filters]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetchActivityLog({
        page,
        limit: 20,
        ...filters,
      });
      if (response) {
        setActivities(response.data || []);
        setTotalPages(response.pagination?.pages || 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactElement> = {
      invite: <User className="w-4 h-4 text-green-400" />,
      bulk_invite: <User className="w-4 h-4 text-green-400" />,
      resend_invite: <User className="w-4 h-4 text-blue-400" />,
      revoke_invite: <User className="w-4 h-4 text-red-400" />,
      change_role: <User className="w-4 h-4 text-yellow-400" />,
      remove_member: <User className="w-4 h-4 text-red-400" />,
      login: <User className="w-4 h-4 text-slate-400" />,
    };
    return icons[action] || <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      invite: 'text-green-400',
      bulk_invite: 'text-green-400',
      resend_invite: 'text-blue-400',
      revoke_invite: 'text-red-400',
      change_role: 'text-yellow-400',
      remove_member: 'text-red-400',
    };
    return colors[action] || 'text-slate-400';
  };

  const formatActionDescription = (activity: TeamActivity) => {
    const userName = activity.user ?
      `${activity.user.firstName || ''} ${activity.user.lastName || ''}`.trim() || activity.user.email :
      'Unknown user';

    switch (activity.action) {
      case 'invite':
        return `${userName} invited ${activity.metadata?.email || 'a team member'}`;
      case 'bulk_invite':
        return `${userName} sent ${activity.metadata?.count || 'multiple'} invitations`;
      case 'resend_invite':
        return `${userName} resent invitation to ${activity.metadata?.email || 'team member'}`;
      case 'revoke_invite':
        return `${userName} revoked invitation for ${activity.metadata?.email || 'team member'}`;
      case 'change_role':
        return `${userName} changed role to ${activity.metadata?.newRole || 'unknown'}`;
      case 'remove_member':
        return `${userName} removed a team member`;
      default:
        return `${userName} performed ${activity.actionLabel || activity.action}`;
    }
  };

  return (
    <CardGlass variant="default" hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Team Activity</h2>
        </div>
        <Button
          variant="ghost-glass"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 rounded-lg bg-slate-800/30 border border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Action Type
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
              >
                <option value="">All Actions</option>
                <option value="invite">Invitations</option>
                <option value="bulk_invite">Bulk Invitations</option>
                <option value="change_role">Role Changes</option>
                <option value="remove_member">Member Removals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-white/10 text-white text-sm focus:ring-2 focus:ring-teal-500/50"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost-glass"
                size="sm"
                onClick={() => {
                  setFilters({ action: '', userId: '', startDate: '', endDate: '' });
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-slate-400 mt-4">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-sm text-slate-400">No activity found</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-colors"
            >
              <div className="mt-1">
                {getActionIcon(activity.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${getActionColor(activity.action)}`}>
                  {formatActionDescription(activity)}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(activity.createdAt)}
                  </span>
                  {activity.resourceType && (
                    <Badge className="bg-slate-700/50 text-slate-400 border-slate-600 text-xs">
                      {activity.resourceType}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost-glass"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || isLoading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </CardGlass>
  );
}